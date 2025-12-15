<?php

namespace App\Services;

use App\Models\Geofence;
use App\Models\User;

class GeofenceService
{
    /**
     * Validate user's location inside assigned geofence(s)
     */
    public static function validateLocation(User $user, float $lat, float $lng): array
    {
        $geofences = collect();

        // User-level assigned geofences
        if ($user->geofences()->exists()) {
            $geofences = $geofences->merge($user->geofences);
        }

        // Department-level geofences
        if ($user->department && $user->department->geofences()->exists()) {
            $geofences = $geofences->merge($user->department->geofences);
        }

        // No geofence = allow
        if ($geofences->isEmpty()) {
            return [
                'inside'   => true,
                'distance' => 0,
                'fence'    => null,
            ];
        }

        $insideAny = false;
        $closestFence = null;
        $closestDistance = PHP_FLOAT_MAX;

        foreach ($geofences as $fence) {

            $inside = false;
            $distance = null; // Only circles use distance

            switch ($fence->shape_type) {

                case 'circle':
                    $coords = $fence->coordinates; // {lat, lng}
                    $distance = self::haversine($lat, $lng, $coords['lat'], $coords['lng']);
                    $inside = $distance <= $fence->radius;

                    if ($distance < $closestDistance) {
                        $closestDistance = $distance;
                        $closestFence = $fence;
                    }
                    break;

                case 'polygon':
                    $inside = self::pointInPolygon(['lat' => $lat, 'lng' => $lng], $fence->coordinates);
                    break;

                case 'rect':
                    $inside = self::pointInRectangle($lat, $lng, $fence->coordinates);
                    break;

                default:
                    // Unknown geofence type
                    continue 2;
            }

            if ($inside) {
                $insideAny = true;
            }
        }

        return [
            'inside'   => $insideAny,
            'distance' => $closestDistance === PHP_FLOAT_MAX ? null : $closestDistance,
            'fence'    => $closestFence,
        ];
    }

    /**
     * Haversine distance in meters
     */
    public static function haversine($lat1, $lng1, $lat2, $lng2): float
    {
        $R = 6371000;

        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2 +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLng / 2) ** 2;

        return $R * (2 * atan2(sqrt($a), sqrt(1 - $a)));
    }

    /**
     * Ray Casting Algorithm (polygon detection)
     */
    public static function pointInPolygon($point, $polygon): bool
    {
        $x = $point['lng'];
        $y = $point['lat'];
        $inside = false;

        $n = count($polygon);
        $j = $n - 1;

        for ($i = 0; $i < $n; $i++) {
            $xi = $polygon[$i]['lng'];
            $yi = $polygon[$i]['lat'];

            $xj = $polygon[$j]['lng'];
            $yj = $polygon[$j]['lat'];

            $intersect = (($yi > $y) != ($yj > $y)) &&
                ($x < ($xj - $xi) * (($y - $yi) / (($yj - $yi) ?: 0.0000001)) + $xi);

            if ($intersect) {
                $inside = !$inside;
            }

            $j = $i;
        }

        return $inside;
    }

    /**
     * Rectangle detection
     */
    public static function pointInRectangle($lat, $lng, $rect): bool
    {
        $latMin = min($rect[0]['lat'], $rect[1]['lat']);
        $latMax = max($rect[0]['lat'], $rect[1]['lat']);

        $lngMin = min($rect[0]['lng'], $rect[1]['lng']);
        $lngMax = max($rect[0]['lng'], $rect[1]['lng']);

        return $lat >= $latMin && $lat <= $latMax && $lng >= $lngMin && $lng <= $lngMax;
    }


    public function createGeofence(array $data): Geofence
    {
        // 1. Create the Geofence
        $geofence = Geofence::create([
            'name' => $data['name'],
            'dist' => $data['dist'],
            'block' => $data['block'] ?? null,
            'coordinates' => $data['coordinates'],
            'shape_type' => $data['shape_type'],
            'radius' => $data['radius'] ?? null, // Only for Circle
        ]);

        // 2. Attach assignees
        if ($data['assign_type'] === 'department' && !empty($data['assignee_ids'])) {
            $geofence->departments()->attach($data['assignee_ids']);
        }

        if ($data['assign_type'] === 'employee' && !empty($data['assignee_ids'])) {
            $geofence->users()->attach($data['assignee_ids']);
        }

        return $geofence;
    }

    // --- Geofence Check Logic (For future Attendance System) ---

    /**
     * Checks if a point is inside a geofence.
     * Includes logic for Circle, Rectangle, and Polygon.
     *
     * @param float $lat
     * @param float $lng
     * @param Geofence $geofence
     * @return bool
     */
    public function isPointInGeofence(float $lat, float $lng, Geofence $geofence): bool
    {
        $coords = $geofence->coordinates;
        $shape = strtolower($geofence->shape_type);

        return match ($shape) {
            'circle' => $this->isPointInCircle($lat, $lng, $coords[0]['lat'], $coords[0]['lng'], $geofence->radius),
            'polygon' => $this->isPointInPolygon($lat, $lng, $coords),
            'rectangle' => $this->isPointInRectangle($lat, $lng, $coords),
            default => false,
        };
    }

    /**
     * Check if a point is inside a circle.
     * Uses Haversine formula to calculate distance between two points.
     *
     * @param float $pointLat
     * @param float $pointLng
     * @param float $centerLat
     * @param float $centerLng
     * @param float $radius In meters
     * @return bool
     */
    protected function isPointInCircle(float $pointLat, float $pointLng, float $centerLat, float $centerLng, float $radius): bool
    {
        $earthRadius = 6371000; // in meters

        $latFrom = deg2rad($centerLat);
        $lonFrom = deg2rad($centerLng);
        $latTo = deg2rad($pointLat);
        $lonTo = deg2rad($pointLng);

        $lonDelta = $lonTo - $lonFrom;
        $latDelta = $latTo - $latFrom;

        $angle = 2 * asin(sqrt(pow(sin($latDelta / 2), 2) +
            cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)));

        $distance = $angle * $earthRadius;

        return $distance <= $radius;
    }

    /**
     * Check if a point is inside a polygon (Ray Casting Algorithm).
     * The polygon coordinates must be an array of objects: [{'lat': 1.2, 'lng': 3.4}, ...].
     *
     * @param float $pointLat
     * @param float $pointLng
     * @param array $polygon
     * @return bool
     */
    protected function isPointInPolygon(float $pointLat, float $pointLng, array $polygon): bool
    {
        $intersectCount = 0;
        $pointX = $pointLng;
        $pointY = $pointLat;
        $polyCount = count($polygon);

        for ($i = 0; $i < $polyCount; $i++) {
            $j = ($i + 1) % $polyCount; // Next vertex
            $vertex1X = $polygon[$i]['lng'];
            $vertex1Y = $polygon[$i]['lat'];
            $vertex2X = $polygon[$j]['lng'];
            $vertex2Y = $polygon[$j]['lat'];

            // Check if ray intersects the segment
            if ((($vertex1Y <= $pointY && $pointY < $vertex2Y) || ($vertex2Y <= $pointY && $pointY < $vertex1Y)) &&
                ($pointX < ($vertex2X - $vertex1X) * ($pointY - $vertex1Y) / ($vertex2Y - $vertex1Y) + $vertex1X)) {
                $intersectCount++;
            }
        }

        // Odd number of intersections means the point is inside
        return $intersectCount % 2 === 1;
    }

    /**
     * Check if a point is inside a rectangle.
     * The rectangle coordinates will be two points (South-West and North-East corners).
     *
     * @param float $pointLat
     * @param float $pointLng
     * @param array $rectangle The bounds: [{'lat': south, 'lng': west}, {'lat': north, 'lng': east}]
     * @return bool
     */
    protected function isPointInRectangle(float $pointLat, float $pointLng, array $rectangle): bool
    {
        // Assuming the Leaflet Draw rectangle gives us the bounds (SW and NE corners)
        if (count($rectangle) < 2) {
            return false;
        }

        $sw = $rectangle[0]; // South-West
        $ne = $rectangle[1]; // North-East

        return ($pointLat >= $sw['lat'] && $pointLat <= $ne['lat']) &&
               ($pointLng >= $sw['lng'] && $pointLng <= $ne['lng']);
    }
}
