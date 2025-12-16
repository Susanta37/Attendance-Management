<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user()->load(['role', 'department', 'settings']);

        return response()->json([
            'status' => true,
            'data' => [
                'id'       => $user->id,
                'name'     => $user->name,
                'email'    => $user->email,
                'phone'    => $user->phone,
                'status'   => $user->status,

                'role' => [
                    'id'   => $user->role?->id,
                    'name' => $user->role?->name,
                    'slug' => $user->role?->slug,
                ],

                'department' => $user->department ? [
                    'id'   => $user->department->id,
                    'name' => $user->department->name,
                ] : null,

                'settings' => [
                    'face_verification_enabled'    => $user->settings->face_verification_enabled,
                    'gps_spoof_check_enabled'      => $user->settings->gps_spoof_check_enabled,
                    'multiple_attendance_allowed' => $user->settings->multiple_attendance_allowed,
                    'allow_outside_geofence'       => $user->settings->allow_outside_geofence,
                    'live_tracking_enabled'        => $user->settings->live_tracking_enabled,
                    'shift_start'                  => $user->settings->shift_start,
                    'shift_end'                    => $user->settings->shift_end,
                ],

                'created_at' => $user->created_at,
            ]
        ]);
    }
}