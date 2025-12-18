<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Geofence;
use App\Models\TrackingAlert;
use App\Services\GeofenceService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AdminLiveTracking extends Controller
{
    public function index()
    {
        // 1. Fetch Users with their LATEST location and Geofences
        $usersRaw = User::where('status', 'active')
            ->with(['role', 'department', 'geofences', 'department.geofences'])
            ->withWhereHas('latestLocation', function($query) {
                $query->whereDate('recorded_at', Carbon::today());
            })
            ->get();

        $processedUsers = [];
        $allGeofences = collect();
        $today = Carbon::today();

        // 2. Process Geofence Logic per User
        foreach ($usersRaw as $user) {
            $location = $user->latestLocation;

            if (!$location) continue;

            // Run Validation Logic
            $validation = GeofenceService::validateLocation(
                $user,
                $location->lat,
                $location->lng
            );

            $status = $validation['inside'] ? 'inside' : 'outside';

            // 3. Anomaly Detection & Alert Generation
            if ($status === 'outside') {
                $this->handleGeofenceBreach($user, $location, $validation['fence']);
            }

            // Collect geofences for map display
            $userGeofences = $user->geofences->merge($user->department?->geofences ?? []);
            foreach ($userGeofences as $fence) {
                // Tag the fence with the user ID for coloring logic on frontend
                $fence->owner_user_id = $user->id;
                $allGeofences->push($fence);
            }

            // Format User for Frontend
            $processedUsers[] = [
                'id' => $user->id,
                'name' => $user->name,
                'initials' => strtoupper(substr($user->name, 0, 2)),
                'role' => $user->role->name ?? 'Staff',
                'lat' => (float) $location->lat,
                'lng' => (float) $location->lng,
                'status' => $status,
                'lastUpdated' => Carbon::parse($location->recorded_at)->format('h:i A'),
                'avatarUrl' => $user->profile_photo_url ?? null,
            ];
        }

        // --- FIX STARTS HERE ---
        // Format Geofences: Flatten 'coordinates' into 'lat' and 'lng'
     $formattedGeofences = $allGeofences->unique('id')->map(function ($fence) {

    // Default center point (used for popup anchor or circle center)
    $centerLat = 0;
    $centerLng = 0;
    $coordinates = $fence->coordinates; // Pass the raw full data

    if (!empty($fence->coordinates)) {
        if ($fence->shape_type === 'circle') {
            // Circle has {lat, lng} structure or [{lat, lng}]
            $centerLat = $fence->coordinates[0]['lat'] ?? $fence->coordinates['lat'] ?? 0;
            $centerLng = $fence->coordinates[0]['lng'] ?? $fence->coordinates['lng'] ?? 0;
        } else {
            // Polygon/Rect has array of points. Use first point as label anchor for now.
            // Ideally calculate centroid, but first point is fine for label.
            $centerLat = $fence->coordinates[0]['lat'] ?? 0;
            $centerLng = $fence->coordinates[0]['lng'] ?? 0;
        }
    }

    return [
        'id' => $fence->id,
        'userId' => $fence->owner_user_id ?? null,
        'name' => $fence->name,
        'lat' => (float) $centerLat,  // Center point for label/popup
        'lng' => (float) $centerLng,  // Center point for label/popup
        'radius' => (float) ($fence->radius ?? 100),
        'scope' => $fence->block ?? 'Zone',
        'shape_type' => strtolower($fence->shape_type), // Ensure lowercase for frontend comparison
        'coordinates' => $coordinates, // PASS FULL COORDINATES FOR POLYGONS
    ];
})->values();
        // --- FIX ENDS HERE ---

        // 4. Fetch Unread Alerts
        $notifications = TrackingAlert::with('user')
            ->whereDate('created_at', $today)
            ->orderBy('created_at', 'desc')
            ->take(50)
            ->get()
            ->map(function ($alert) {
                return [
                    'id' => $alert->id,
                    'title' => $alert->title,
                    'message' => $alert->message,
                    'timestamp' => $alert->created_at->diffForHumans(),
                    'relatedUserId' => $alert->user_id,
                    'isRead' => !is_null($alert->read_at),
                    'type' => $alert->type === 'geofence_breach' ? 'alert' : 'info',
                ];
            });

        return Inertia::render('SuperAdmin/MasterDashboard/GeofenceTracking', [
            'users' => $processedUsers,
            'geofences' => $formattedGeofences, // Pass the formatted array
            'notifications' => $notifications,
        ]);
    }

    private function handleGeofenceBreach($user, $location, $geofence)
    {
        $existingAlert = TrackingAlert::where('user_id', $user->id)
            ->where('type', 'geofence_breach')
            ->where('created_at', '>=', Carbon::now()->subMinutes(30))
            ->exists();

        if (!$existingAlert) {
            TrackingAlert::create([
                'user_id' => $user->id,
                'geofence_id' => $geofence?->id,
                'type' => 'geofence_breach',
                'title' => 'Geofence Breach',
                'message' => "{$user->name} is outside their assigned zone.",
                'lat' => $location->lat,
                'lng' => $location->lng,
            ]);
        }
    }

    public function markNotificationRead(TrackingAlert $alert)
    {
        // Update the timestamp if it hasn't been read yet
        if (is_null($alert->read_at)) {
            $alert->update([
                'read_at' => now(),
            ]);
        }

        return response()->json(['success' => true, 'message' => 'Notification marked as read']);
    }
}
