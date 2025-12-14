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
protected string $serviceUrl = 'http://139.59.42.28';

    /**
     * Check-in API
     * - Expects: image (base64), lat, lng, device_id
     */
  public function checkIn(Request $request)
{
    $user = $request->user();
    $settings = $user->settings;
    $today = now()->toDateString();

    Log::info('CheckIn Request', [
        'user_id' => $user->id,
        'face_verification_enabled' => $settings->face_verification_enabled,
        'has_image' => $request->has('image'),
    ]);

    /**
     * 0️⃣ VALIDATION
     */
    $rules = [
        'lat'       => 'required|numeric',
        'lng'       => 'required|numeric',
        'device_id' => 'required|string',
    ];

    if ($settings->face_verification_enabled) {
        $rules['image'] = 'required|string';
    }

    $request->validate($rules);

    /**
     * 1️⃣ MULTIPLE ATTENDANCE RULE
     */
    $existing = Attendance::where('user_id', $user->id)
        ->where('date', $today)
        ->whereNull('check_out_time')
        ->first();

    if (!$settings->multiple_attendance_allowed && $existing) {
        return response()->json(['error' => 'Already checked in'], 409);
    }

    if ($settings->multiple_attendance_allowed) {
        $existing = null;
    }

    /**
     * 2️⃣ FACE VERIFICATION (ONLY IF ENABLED)
     */
    if ($settings->face_verification_enabled) {
        $stored = UserFaceEmbedding::where('user_id', $user->id)->first();

        if (!$stored) {
            return response()->json(['error' => 'No face enrolled'], 400);
        }

        $encoded = Http::timeout(30)->post("{$this->serviceUrl}/encode", [
            'image' => $request->image
        ]);

        if (!$encoded->successful() || !($encoded->json()['success'] ?? false)) {
            return response()->json(['error' => 'Face detection failed'], 422);
        }

        $compare = Http::timeout(30)->post("{$this->serviceUrl}/compare", [
            'embedding1' => json_decode($stored->embedding, true),
            'embedding2' => $encoded->json()['embedding']
        ]);

        if (!$compare->successful() || !($compare->json()['match'] ?? false)) {
            return response()->json(['error' => 'Face does not match'], 403);
        }
    }

    /**
     * 3️⃣ IMAGE SAVE
     */
    $imagePath = null;

    if ($request->image) {
        $imageName = "checkin_{$user->id}_" . time() . ".jpg";
        Storage::disk('public')->put("attendance/$imageName", base64_decode($request->image));
        $imagePath = "attendance/$imageName";
    }

    /**
     * 4️⃣ GEOFENCE + SPOOF CHECK
     */
    $fence = GeofenceService::validateLocation($user, $request->lat, $request->lng);

    $inside = $settings->allow_outside_geofence ? true : ($fence['inside'] ?? false);
    $distance = $fence['distance'] ?? null;

    $isAnomaly = $settings->gps_spoof_check_enabled
        ? SpoofDetectionService::isSpoofed($user, $request->lat, $request->lng)
        : false;

    /**
     * 5️⃣ CREATE ATTENDANCE
     */
    $attendance = Attendance::create([
        'user_id'               => $user->id,
        'date'                  => $today,
        'check_in_time'         => now(),
        'check_in_image'        => $imagePath,
        'check_in_lat'          => $request->lat,
        'check_in_lng'          => $request->lng,
        'is_face_matched'       => $settings->face_verification_enabled ? true : null,
        'is_inside_fence'       => $inside,
        'distance_from_fence_m' => $distance,
        'is_anomaly'            => $isAnomaly,
        'device_id'             => $request->device_id,
    ]);

    /**
     * 6️⃣ SAVE LOCATION POINT
     */
    EmployeeLocation::create([
        'user_id'       => $user->id,
        'attendance_id' => $attendance->id,
        'lat'           => $request->lat,
        'lng'           => $request->lng,
        'device_id'     => $request->device_id,
        'recorded_at'   => now(),
    ]);

    Log::info('Check-in successful', ['attendance_id' => $attendance->id]);

    return response()->json([
        'status'  => true,
        'message' => 'Check-in successful',
        'data'    => $attendance
    ], 201);
}


    /**
     * Check-out API
     * - Expects: image (base64), lat, lng, device_id (optional)
     */
   public function checkOut(Request $request)
{
    $user = $request->user();
    $settings = $user->settings;
    $today = now()->toDateString();

    Log::info('CheckOut Request', [
        'user_id' => $user->id,
        'face_verification_enabled' => $settings->face_verification_enabled,
    ]);

    /**
     * 0️⃣ VALIDATION
     */
    $rules = [
        'lat'       => 'required|numeric',
        'lng'       => 'required|numeric',
        'device_id' => 'nullable|string',
    ];

    if ($settings->face_verification_enabled) {
        $rules['image'] = 'required|string';
    }

    $request->validate($rules);

    /**
     * 1️⃣ ACTIVE ATTENDANCE
     */
    $attendance = Attendance::where('user_id', $user->id)
        ->where('date', $today)
        ->whereNull('check_out_time')
        ->first();

    if (!$attendance) {
        return response()->json(['error' => 'You must check in first'], 400);
    }

    /**
     * 2️⃣ FACE VERIFICATION (ONLY IF ENABLED)
     */
    if ($settings->face_verification_enabled) {
        $stored = UserFaceEmbedding::where('user_id', $user->id)->first();

        if (!$stored) {
            return response()->json(['error' => 'No face enrolled'], 400);
        }

        $encoded = Http::timeout(30)->post("{$this->serviceUrl}/encode", [
            'image' => $request->image
        ]);

        if (!$encoded->successful() || !($encoded->json()['success'] ?? false)) {
            return response()->json(['error' => 'Face detection failed'], 422);
        }

        $compare = Http::timeout(30)->post("{$this->serviceUrl}/compare", [
            'embedding1' => json_decode($stored->embedding, true),
            'embedding2' => $encoded->json()['embedding']
        ]);

        if (!$compare->successful() || !($compare->json()['match'] ?? false)) {
            return response()->json(['error' => 'Face does not match'], 403);
        }
    }

    /**
     * 3️⃣ IMAGE SAVE
     */
    $imagePath = null;

    if ($request->image) {
        $imageName = "checkout_{$user->id}_" . time() . ".jpg";
        Storage::disk('public')->put("attendance/$imageName", base64_decode($request->image));
        $imagePath = "attendance/$imageName";
    }

    /**
     * 4️⃣ GEOFENCE + SPOOF CHECK
     */
    $fence = GeofenceService::validateLocation($user, $request->lat, $request->lng);

    $inside = $settings->allow_outside_geofence ? true : ($fence['inside'] ?? false);
    $distance = $fence['distance'] ?? null;

    $isAnomaly = $settings->gps_spoof_check_enabled
        ? SpoofDetectionService::isSpoofed($user, $request->lat, $request->lng)
        : false;

    /**
     * 5️⃣ UPDATE ATTENDANCE
     */
    $attendance->update([
        'check_out_time'        => now(),
        'check_out_image'       => $imagePath,
        'check_out_lat'         => $request->lat,
        'check_out_lng'         => $request->lng,
        'is_inside_fence'       => $inside,
        'distance_from_fence_m' => $distance,
        'is_anomaly'            => $isAnomaly,
        'device_id'             => $request->device_id ?? $attendance->device_id,
    ]);

    /**
     * 6️⃣ SAVE LOCATION POINT
     */
    EmployeeLocation::create([
        'user_id'       => $user->id,
        'attendance_id' => $attendance->id,
        'lat'           => $request->lat,
        'lng'           => $request->lng,
        'device_id'     => $request->device_id,
        'recorded_at'   => now(),
    ]);

    Log::info('Check-out successful', ['attendance_id' => $attendance->id]);

    return response()->json([
        'status'  => true,
        'message' => 'Check-out successful',
        'data'    => $attendance
    ], 200);
}


    public function liveLocation(Request $request)
{
    $request->validate([
        'lat' => 'required|numeric',
        'lng' => 'required|numeric',
        'speed' => 'nullable|numeric',
        'accuracy' => 'nullable|numeric',
        'battery' => 'nullable|integer',
        'device_id' => 'nullable|string',
    ]);

    $user = $request->user();
    $today = now()->toDateString();

    /**
     * Fetch today’s attendance:
     * - check_in must exist
     * - check_out must be NULL (still active session)
     */
    $attendance = Attendance::where('user_id', $user->id)
        ->where('date', $today)
        ->whereNotNull('check_in_time')
        ->whereNull('check_out_time')
        ->first();

    // Save live location
    $location = EmployeeLocation::create([
        'user_id'       => $user->id,
        'attendance_id' => $attendance->id ?? null, // NULL if not checked in yet
        'lat'           => $request->lat,
        'lng'           => $request->lng,
        'speed'         => $request->speed,
        'accuracy'      => $request->accuracy,
        'battery'       => $request->battery,
        'device_id'     => $request->device_id,
        'recorded_at'   => now(),
    ]);

    return response()->json([
        'status' => true,
        'message' => 'Live location saved',
        'linked_to_attendance' => $attendance ? true : false,
        'data' => $location
    ]);
}


public function status(Request $request)
{
    $user = $request->user();
    $today = now()->toDateString();

    // Fetch today's attendance
    $attendance = Attendance::where('user_id', $user->id)
        ->where('date', $today)
        ->first();

    // No attendance record at all
    if (! $attendance) {
        return response()->json([
            'status' => true,
            'attendance_status' => 'not_checked_in',
            'message' => 'User has not checked in today.',
            'data' => null
        ], 200);
    }

    // Checked in but not checked out
    if ($attendance->check_in_time && ! $attendance->check_out_time) {
        return response()->json([
            'status' => true,
            'attendance_status' => 'checked_in',
            'message' => 'User is currently checked in.',
            'data' => [
                'check_in_time'  => $attendance->check_in_time,
                'check_in_image' => $attendance->check_in_image
                    ? asset('storage/' . $attendance->check_in_image)
                    : null,
                'lat'            => $attendance->check_in_lat,
                'lng'            => $attendance->check_in_lng,
            ]
        ], 200);
    }

    // Already checked out → STATUS = completed
    if ($attendance->check_out_time) {
        return response()->json([
            'status' => true,
            'attendance_status' => 'completed',
            'message' => 'User has completed today’s check-in and check-out.',
            'data' => [
                'check_in_time'   => $attendance->check_in_time,
                'check_out_time'  => $attendance->check_out_time,
                'check_in_image'  => $attendance->check_in_image
                    ? asset('storage/' . $attendance->check_in_image)
                    : null,
                'check_out_image' => $attendance->check_out_image
                    ? asset('storage/' . $attendance->check_out_image)
                    : null,
            ]
        ], 200);
    }

    // Fallback (unlikely)
    return response()->json([
        'status' => true,
        'attendance_status' => 'unknown',
        'message' => 'Unable to determine status.',
        'data' => $attendance
    ], 200);
}



}
