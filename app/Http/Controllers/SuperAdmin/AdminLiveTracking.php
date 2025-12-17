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
        // We filter for users who actually have a role that requires tracking (optional)
        $usersRaw = User::where('status', 'active') // Assuming you have a status field
            ->with(['role', 'department', 'geofences', 'department.geofences'])
            ->withWhereHas('latestLocation', function($query) {
                // Only get locations from today to keep map clean
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
                'status' => $status, // 'inside' or 'outside'
                'lastUpdated' => Carbon::parse($location->recorded_at)->format('h:i A'),
                'avatarUrl' => $user->profile_photo_url ?? null, // If using Jetstream
            ];
        }

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
            'geofences' => $allGeofences->unique('id')->values(), // Remove duplicates
            'notifications' => $notifications,
        ]);
    }

    /**
     * Handle logic to prevent alert spamming
     */
    private function handleGeofenceBreach($user, $location, $geofence)
    {
        // Check if we already alerted about this user in the last 30 minutes
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
}
