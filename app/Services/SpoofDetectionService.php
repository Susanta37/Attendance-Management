<?php

namespace App\Services;

use App\Models\EmployeeLocation;

class SpoofDetectionService
{
    public static function isSpoofed($user, $lat, $lng)
    {
        $last = EmployeeLocation::where('user_id', $user->id)
            ->latest('id')
            ->first();

        if (!$last) {
            return false;
        }

        $timeDiff = now()->diffInSeconds($last->recorded_at);
        if ($timeDiff == 0) $timeDiff = 1;

        $distance = GeofenceService::haversine(
            $last->lat,
            $last->lng,
            $lat,
            $lng
        );

        $speed = $distance / $timeDiff; // meters per sec

        // Over 40 m/s => very suspicious
        if ($speed > 40) {
            return true;
        }

        // Teleport more than 5km instantly
        if ($distance > 5000) {
            return true;
        }

        return false;
    }
}
