<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
{
    $user  = $request->user();
    $today = now()->toDateString();

    // Get all today's attendance records
    $todayAttendances = Attendance::where('user_id', $user->id)
        ->where('date', $today)
        ->whereNotNull('check_in_time')
        ->orderBy('check_in_time', 'asc')
        ->get();

    // Determine status
    $attendanceStatus = $todayAttendances->isNotEmpty()
        ? 'present'
        : 'absent';

    return response()->json([
        'status' => true,
        'data' => [
            'user' => [
                'name' => $user->name,
            ],
            'settings' => [
                'face_verification_enabled'    => $user->settings->face_verification_enabled,
                'gps_spoof_check_enabled'      => $user->settings->gps_spoof_check_enabled,
                'multiple_attendance_allowed' => $user->settings->multiple_attendance_allowed,
                'allow_outside_geofence'       => $user->settings->allow_outside_geofence,
                'live_tracking_enabled'        => $user->settings->live_tracking_enabled,
            ],
            'today_attendance' => [
                'status' => $attendanceStatus, // present | absent
                'count'  => $todayAttendances->count(),
                'records'=> $todayAttendances,
            ]
        ]
    ]);
}

}