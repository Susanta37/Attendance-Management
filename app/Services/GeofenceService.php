<?php

namespace App\Services;

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
}
