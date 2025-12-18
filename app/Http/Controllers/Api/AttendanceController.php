<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Attendance;
use App\Models\EmployeeLocation;
use App\Models\UserFaceEmbedding;
use App\Services\GeofenceService;
use App\Services\SpoofDetectionService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class AttendanceController extends Controller
{
     // set this to your face service URL (or inject via constructor)
protected string $serviceUrl = 'http://kendrapada.nexprodigitalschool.com';



public function checkIn(Request $request)
{
    $user = $request->user();
    $settings = $user->settings;
    $today = now()->toDateString();

    Log::info('CHECK-IN START', [
        'user_id' => $user->id,
        'date' => $today,
    ]);

    $rules = [
        'lat'       => 'required|numeric',
        'lng'       => 'required|numeric',
        'device_id' => 'required|string',
    ];

    if ($settings->face_verification_enabled) {
        $rules['image'] = 'required|string';
    }

    Log::info('CHECK-IN VALIDATION RULES', $rules);

    $request->validate($rules);

    // Prevent multiple check-ins
    $existing = Attendance::where('user_id', $user->id)
        ->where('date', $today)
        ->whereNull('check_out_time')
        ->first();

    if (!$settings->multiple_attendance_allowed && $existing) {
        Log::warning('CHECK-IN BLOCKED: Already checked in', [
            'user_id' => $user->id,
            'attendance_id' => $existing->id
        ]);

        return response()->json(['error' => 'Already checked in'], 409);
    }

    /**
     * 1️⃣ FACE VERIFICATION
     */
    if ($settings->face_verification_enabled) {
        Log::info('FACE VERIFICATION START', ['user_id' => $user->id]);

        $stored = UserFaceEmbedding::where('user_id', $user->id)->first();

        if (!$stored) {
            Log::error('FACE VERIFICATION FAILED: No face enrolled', [
                'user_id' => $user->id
            ]);

            return response()->json(['error' => 'No face enrolled'], 400);
        }

        $encoded = Http::timeout(20)->post("{$this->serviceUrl}/encode", [
            'image' => $request->image
        ]);

        if (!$encoded->successful()) {
            Log::error('FACE ENCODE API FAILED', [
                'status' => $encoded->status(),
                'response' => $encoded->body()
            ]);

            return response()->json(['error' => 'Face detection failed'], 422);
        }

        $compare = Http::timeout(20)->post("{$this->serviceUrl}/compare", [
            'embedding1' => json_decode($stored->embedding, true),
            'embedding2' => $encoded->json()['embedding']
        ]);

        if (!$compare->successful() || !($compare->json()['match'] ?? false)) {
            Log::warning('FACE MISMATCH', [
                'user_id' => $user->id,
                'distance' => $compare->json()['distance'] ?? null
            ]);

            return response()->json([
                'error' => 'Face does not match',
                'distance' => $compare->json()['distance'] ?? null
            ], 403);
        }

        Log::info('FACE VERIFICATION PASSED', ['user_id' => $user->id]);
    }

    /**
     * 2️⃣ GPS SPOOF DETECTION
     */
    $isAnomaly = false;

    if ($settings->gps_spoof_check_enabled) {
        Log::info('GPS SPOOF CHECK START', [
            'user_id' => $user->id,
            'lat' => $request->lat,
            'lng' => $request->lng
        ]);

        if (SpoofDetectionService::isSpoofed($user, $request->lat, $request->lng)) {
            $isAnomaly = true;

            Log::warning('GPS SPOOF DETECTED', [
                'user_id' => $user->id
            ]);

            return response()->json([
                'error' => 'Suspicious GPS activity detected'
            ], 403);
        }

        Log::info('GPS SPOOF CHECK PASSED', ['user_id' => $user->id]);
    }

    /**
     * 3️⃣ GEOFENCE VALIDATION
     */
    Log::info('GEOFENCE CHECK START', [
        'user_id' => $user->id,
        'lat' => $request->lat,
        'lng' => $request->lng
    ]);

    $geofenceResult = GeofenceService::validateLocation(
        $user,
        $request->lat,
        $request->lng
    );

    Log::info('GEOFENCE RESULT', [
        'inside' => $geofenceResult['inside'],
        'distance' => $geofenceResult['distance'],
        'fence_id' => $geofenceResult['fence']->id ?? null
    ]);

    if (!$geofenceResult['inside'] && !$settings->allow_outside_geofence) {
        Log::warning('CHECK-IN BLOCKED: Outside geofence', [
            'user_id' => $user->id,
            'distance' => $geofenceResult['distance']
        ]);

        return response()->json([
            'error' => 'You are outside the allowed geofence area',
            'distance_from_fence' => $geofenceResult['distance']
        ], 403);
    }

    /**
     * 4️⃣ Save Check-in Image
     */
    $imagePath = null;
    if ($request->image) {
        $imageName = "checkin_{$user->id}_" . time() . ".jpg";
        Storage::disk('public')->put(
            "attendance/$imageName",
            base64_decode(explode(',', $request->image)[1])
        );

        $imagePath = "attendance/$imageName";

        Log::info('CHECK-IN IMAGE SAVED', [
            'path' => $imagePath
        ]);
    }

    /**
     * 5️⃣ Create Attendance
     */
    $attendance = Attendance::create([
        'user_id'               => $user->id,
        'date'                  => $today,
        'check_in_time'         => now(),
        'check_in_image'        => $imagePath,
        'check_in_lat'          => $request->lat,
        'check_in_lng'          => $request->lng,
        'is_face_matched'       => $settings->face_verification_enabled,
        'is_inside_fence'       => $geofenceResult['inside'],
        'distance_from_fence_m' => $geofenceResult['distance'],
        'is_anomaly'            => $isAnomaly,
        'device_id'             => $request->device_id,
    ]);

    /**
 * 6️⃣ Create Live Location (Initial Check-in Point)
 */
EmployeeLocation::create([
    'user_id'        => $user->id,
    'attendance_id'  => $attendance->id,
    'lat'            => $request->lat,
    'lng'            => $request->lng,
    'recorded_at'    => now(),
]);

    Log::info('CHECK-IN SUCCESS', [
        'attendance_id' => $attendance->id,
        'user_id' => $user->id
    ]);

    return response()->json([
        'status'  => true,
        'message' => 'Check-in successful',
        'data'    => $attendance
    ], 201);
}




/**
     * Check-out API
     */
 public function checkOut(Request $request)
{
    $user = $request->user();
    $settings = $user->settings;
    $today = now()->toDateString();

    // Validation rules
    $rules = [
        'lat' => 'required|numeric',
        'lng' => 'required|numeric',
    ];

    if ($settings->face_verification_enabled) {
        $rules['image'] = 'required|string';
    }

    $request->validate($rules);

    // Get today's open attendance
    $attendance = Attendance::where('user_id', $user->id)
        ->where('date', $today)
        ->whereNull('check_out_time')
        ->first();

    if (!$attendance) {
        return response()->json([
            'error' => 'Check-in required before checkout'
        ], 400);
    }

    /**
     * FACE VERIFICATION
     */
    if ($settings->face_verification_enabled) {
        $stored = UserFaceEmbedding::where('user_id', $user->id)->first();

        if (!$stored) {
            return response()->json(['error' => 'No face enrolled'], 400);
        }

        $encoded = Http::timeout(20)->post("{$this->serviceUrl}/encode", [
            'image' => $request->image
        ]);

        if (!$encoded->successful() || !($encoded->json()['success'] ?? false)) {
            return response()->json(['error' => 'Face detection failed'], 422);
        }

        $compare = Http::timeout(20)->post("{$this->serviceUrl}/compare", [
            'embedding1' => json_decode($stored->embedding, true),
            'embedding2' => $encoded->json()['embedding']
        ]);

        if (!$compare->successful() || !($compare->json()['match'] ?? false)) {
            return response()->json([
                'error'    => 'Face does not match',
                'distance' => $compare->json()['distance'] ?? null
            ], 403);
        }
    }

    /**
     * Save Checkout Image
     */
    $imagePath = null;
    if ($request->image) {
        $imageName = "checkout_{$user->id}_" . time() . ".jpg";
        Storage::disk('public')->put(
            "attendance/$imageName",
            base64_decode(explode(',', $request->image)[1])
        );
        $imagePath = "attendance/$imageName";
    }

    /**
     * Update Attendance
     */
    $attendance->update([
        'check_out_time'  => now(),
        'check_out_image' => $imagePath,
        'check_out_lat'   => $request->lat,
        'check_out_lng'   => $request->lng,
    ]);

    /**
 *  Create Live Location (Checkout Point)
 */
$timeSpentSeconds = Carbon::parse($attendance->check_in_time)
    ->diffInSeconds(now());

EmployeeLocation::create([
    'user_id'              => $user->id,
    'attendance_id'        => $attendance->id,
    'lat'                  => $request->lat,
    'lng'                  => $request->lng,
    'recorded_at'          => now(),
    'time_spent_seconds'   => $timeSpentSeconds,
]);

    return response()->json([
        'status'  => true,
        'message' => 'Check-out successful',
        'data'    => $attendance
    ]);
}




    public function liveLocation(Request $request)
{
    $request->validate([
        'lat'      => 'required|numeric',
        'lng'      => 'required|numeric',
        'name'     => 'nullable|string|max:255', // location name
        'speed'    => 'nullable|numeric',
        'accuracy' => 'nullable|numeric',
        'battery'  => 'nullable|integer',
    ]);

    $user  = $request->user();
    $today = now()->toDateString();

    /**
     * Get active attendance (if any)
     */
    $attendance = Attendance::where('user_id', $user->id)
        ->where('date', $today)
        ->whereNotNull('check_in_time')
        ->whereNull('check_out_time')
        ->first();

    /**
     * ⏱ Update time_spent for previous location
     */
    $previousLocation = EmployeeLocation::where('user_id', $user->id)
        ->latest('recorded_at')
        ->first();

    if ($previousLocation) {
        $seconds = $previousLocation->recorded_at->diffInSeconds(now());

        $previousLocation->update([
            'time_spent_seconds' => $seconds
        ]);
    }

    /**
     * Save current live location
     */
    $location = EmployeeLocation::create([
        'user_id'       => $user->id,
        'attendance_id' => $attendance?->id,
        'name'          => $request->name,
        'lat'           => $request->lat,
        'lng'           => $request->lng,
        'speed'         => $request->speed,
        'accuracy'      => $request->accuracy,
        'battery'       => $request->battery,
        'recorded_at'   => now(),
    ]);

    return response()->json([
        'status'               => true,
        'message'              => 'Live location saved',
        'linked_to_attendance' => (bool) $attendance,
        'data'                 => $location
    ]);
}


public function status(Request $request)
{
    $user = $request->user();
    $settings = $user->settings;
    $today = now()->toDateString();

    $attendance = Attendance::where('user_id', $user->id)
        ->where('date', $today)
        ->orderBy('created_at', 'desc')
        ->first();

    // 1️⃣ No attendance today
    if (! $attendance) {
        return response()->json([
            'status' => true,
            'attendance_status' => 'not_checked_in',
            'message' => 'User has not checked in today.',
            'data' => null
        ], 200);
    }

    // 2️⃣ Active session (checked in, not checked out)
    if ($attendance->check_in_time && ! $attendance->check_out_time) {
        return response()->json([
            'status' => true,
            'attendance_status' => 'checked_in',
            'message' => 'User is currently checked in.',
            'data' => [
                'check_in_time' => $attendance->check_in_time,
                'lat' => $attendance->check_in_lat,
                'lng' => $attendance->check_in_lng,
            ]
        ], 200);
    }

    // 3️⃣ Session closed, multiple attendance allowed → CHECKED_OUT
if ($attendance->check_out_time && $settings->multiple_attendance_allowed) {
    return response()->json([
        'status' => true,
        'attendance_status' => 'checked_out',
        'message' => 'Multiple attendance allowed. User can check in again.',
        'data' => [
            'check_in_time'      => $attendance->check_in_time,   // ✅ added
            'check_out_time'=> $attendance->check_out_time,
        ]
    ], 200);
}


    // 4️⃣ Session closed, multiple attendance NOT allowed → COMPLETED
    return response()->json([
        'status' => true,
        'attendance_status' => 'completed',
        'message' => 'User has completed today’s attendance.',
        'data' => [
            'check_in_time'  => $attendance->check_in_time,
            'check_out_time' => $attendance->check_out_time,
        ]
    ], 200);
}



}