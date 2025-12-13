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
protected string $serviceUrl = 'http://127.0.0.1:5005';

    /**
     * Check-in API
     * - Expects: image (base64), lat, lng, device_id
     */
    public function checkIn(Request $request)
    {
        $user = $request->user();
        $settings = $user->settings;
        $today = now()->toDateString();

        // 🔍 DEBUG LOG
        Log::info('CheckIn Request', [
            'user_id' => $user->id,
            'face_verification_enabled' => $settings->face_verification_enabled,
            'has_image' => $request->has('image'),
            'image_length' => $request->has('image') ? strlen($request->image) : 0,
        ]);

        /**
         * 0️⃣ DYNAMIC VALIDATION RULES
         */
        $rules = [
            'lat'       => 'required|numeric',
            'lng'       => 'required|numeric',
            'device_id' => 'required|string',
        ];

        // Image required ONLY if face verification enabled
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

        if (!$settings->multiple_attendance_allowed && $existing && $existing->check_in_time) {
            return response()->json(['error' => 'Already checked in'], 409);
        }

        if ($settings->multiple_attendance_allowed) {
            // Always create a new attendance row
            $existing = null;
        }

        /**
         * 2️⃣ FACE VERIFICATION (ONLY IF ENABLED)
         */
        if ($settings->face_verification_enabled) {
            Log::info('Starting face verification for user', ['user_id' => $user->id]);

            $stored = UserFaceEmbedding::where('user_id', $user->id)->first();
            if (!$stored) {
                Log::error('No face embedding found', ['user_id' => $user->id]);
                return response()->json(['error' => 'No face enrolled. Please register your face first.'], 400);
            }

            // Encode face from provided image
            try {
                Log::info('Sending image to encode endpoint');

                $encoded = Http::timeout(30)->post("{$this->serviceUrl}/encode", [
                    'image' => $request->image
                ]);

                Log::info('Encode response', [
                    'status' => $encoded->status(),
                    'body' => $encoded->json()
                ]);

                if (!$encoded->successful()) {
                    Log::error('Face encode failed', [
                        'status' => $encoded->status(),
                        'response' => $encoded->body()
                    ]);
                    return response()->json([
                        'error' => 'Face encoding failed',
                        'details' => $encoded->json()['error'] ?? 'Unknown error'
                    ], 422);
                }

                $encodeData = $encoded->json();

                if (!($encodeData['success'] ?? false)) {
                    Log::error('Encode success=false', ['data' => $encodeData]);
                    return response()->json([
                        'error' => $encodeData['error'] ?? 'Face detection failed'
                    ], 422);
                }

                if (!isset($encodeData['embedding'])) {
                    Log::error('No embedding in response', ['data' => $encodeData]);
                    return response()->json(['error' => 'No face embedding returned'], 422);
                }

            } catch (\Exception $e) {
                Log::error('Face encode exception', [
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                return response()->json([
                    'error' => 'Face recognition service unavailable',
                    'details' => $e->getMessage()
                ], 500);
            }

            // Compare embeddings
            try {
                Log::info('Comparing face embeddings');

                $compare = Http::timeout(30)->post("{$this->serviceUrl}/compare", [
                    'embedding1' => json_decode($stored->embedding, true),
                    'embedding2' => $encodeData['embedding']
                ]);

                Log::info('Compare response', [
                    'status' => $compare->status(),
                    'body' => $compare->json()
                ]);

                if (!$compare->successful()) {
                    Log::error('Face compare failed', [
                        'status' => $compare->status(),
                        'response' => $compare->body()
                    ]);
                    return response()->json(['error' => 'Face comparison failed'], 500);
                }

                $compareData = $compare->json();

                if (!($compareData['match'] ?? false)) {
                    Log::warning('Face mismatch detected', [
                        'user_id' => $user->id,
                        'distance' => $compareData['distance'] ?? 'unknown'
                    ]);
                    return response()->json([
                        'error' => 'Face does not match. Please try again with proper lighting.',
                        'distance' => $compareData['distance'] ?? null
                    ], 403);
                }

                Log::info('Face matched successfully', [
                    'user_id' => $user->id,
                    'distance' => $compareData['distance'] ?? 'unknown'
                ]);

            } catch (\Exception $e) {
                Log::error('Face compare exception', [
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                return response()->json([
                    'error' => 'Face comparison service unavailable',
                    'details' => $e->getMessage()
                ], 500);
            }
        }

        /**
         * 3️⃣ SAVE IMAGE (ONLY IF PROVIDED)
         */
        $imagePath = null;

        if ($request->has('image') && $request->image) {
            try {
                $imageName = "checkin_{$user->id}_" . time() . ".jpg";
                Storage::disk('public')->put("attendance/$imageName", base64_decode($request->image));
                $imagePath = "attendance/$imageName";
            } catch (\Throwable $e) {
                Log::error('Image save failed', ['error' => $e->getMessage()]);
                return response()->json(['error' => 'Failed to save image'], 500);
            }
        }

        /**
         * 4️⃣ GEOFENCE CHECK
         */
        $fence = GeofenceService::validateLocation($user, $request->lat, $request->lng);
        $inside = $fence['inside'] ?? false;
        $distance = $fence['distance'] ?? null;

        // Allow outside geofence override
        if ($settings->allow_outside_geofence) {
            $inside = true;
        }

        /**
         * 5️⃣ GPS SPOOF CHECK (ONLY IF ENABLED)
         */
        $isAnomaly = false;

        if ($settings->gps_spoof_check_enabled) {
            $isAnomaly = SpoofDetectionService::isSpoofed($user, $request->lat, $request->lng);
        }

        /**
         * 6️⃣ CREATE OR UPDATE ATTENDANCE ROW
         */
        if (!$existing) {
            $attendance = Attendance::create([
                'user_id'               => $user->id,
                'date'                  => $today,
                'check_in_time'         => now()->format('H:i:s'),
                'check_in_image'        => $imagePath,
                'check_in_lat'          => $request->lat,
                'check_in_lng'          => $request->lng,
                'is_face_matched'       => $settings->face_verification_enabled ? true : null,
                'is_inside_fence'       => $inside,
                'distance_from_fence_m' => $distance,
                'is_anomaly'            => $isAnomaly,
                'device_id'             => $request->device_id,
            ]);
        } else {
            $existing->update([
                'check_in_time'         => now()->format('H:i:s'),
                'check_in_image'        => $imagePath,
                'check_in_lat'          => $request->lat,
                'check_in_lng'          => $request->lng,
                'is_face_matched'       => $settings->face_verification_enabled ? true : null,
                'is_inside_fence'       => $inside,
                'distance_from_fence_m' => $distance,
                'is_anomaly'            => $isAnomaly,
                'device_id'             => $request->device_id,
            ]);

            $attendance = $existing;
        }

        /**
         * 7️⃣ SAVE LIVE LOCATION (check-in point)
         */
        EmployeeLocation::create([
            'user_id'       => $user->id,
            'attendance_id' => $attendance->id,
            'lat'           => $request->lat,
            'lng'           => $request->lng,
            'device_id'     => $request->device_id,
            'recorded_at'   => now(),
        ]);

        /**
         * 8️⃣ ALERTS (ONLY IF OUTSIDE NOT ALLOWED)
         */
        if (!$inside && !$settings->allow_outside_geofence) {
            Alert::create([
                'user_id'       => $user->id,
                'attendance_id' => $attendance->id,
                'type'          => 'outside_fence',
                'title'         => 'Outside Geofence',
                'message'       => 'User checked in outside the assigned geofence.'
            ]);
        }

        if ($isAnomaly) {
            Alert::create([
                'user_id'       => $user->id,
                'attendance_id' => $attendance->id,
                'type'          => 'spoof_detected',
                'title'         => 'Possible Spoof/Anomaly',
                'message'       => 'Spoof detection flagged this check-in.'
            ]);
        }

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

        // 🔍 DEBUG LOG
        Log::info('CheckOut Request', [
            'user_id' => $user->id,
            'face_verification_enabled' => $settings->face_verification_enabled,
            'has_image' => $request->has('image'),
        ]);

        /**
         * 0️⃣ DYNAMIC VALIDATION
         */
        $rules = [
            'lat'       => 'required|numeric',
            'lng'       => 'required|numeric',
            'device_id' => 'nullable|string',
        ];

        // Image required only if face verification is enabled
        if ($settings->face_verification_enabled) {
            $rules['image'] = 'required|string';
        }

        $request->validate($rules);

        /**
         * 1️⃣ FETCH ACTIVE ATTENDANCE (must not be checked out yet)
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
            Log::info('Starting face verification for checkout', ['user_id' => $user->id]);

            $stored = UserFaceEmbedding::where('user_id', $user->id)->first();
            if (!$stored) {
                return response()->json(['error' => 'No face enrolled'], 400);
            }

            // Encode provided checkout image
            try {
                $encoded = Http::timeout(30)->post("{$this->serviceUrl}/encode", [
                    'image' => $request->image
                ]);

                Log::info('Encode response (checkout)', [
                    'status' => $encoded->status(),
                    'body' => $encoded->json()
                ]);

                if (!$encoded->successful()) {
                    return response()->json([
                        'error' => 'Face encoding failed',
                        'details' => $encoded->json()['error'] ?? 'Unknown error'
                    ], 422);
                }

                $encodeData = $encoded->json();

                if (!($encodeData['success'] ?? false)) {
                    return response()->json([
                        'error' => $encodeData['error'] ?? 'Face detection failed'
                    ], 422);
                }

                if (!isset($encodeData['embedding'])) {
                    return response()->json(['error' => 'No face embedding returned'], 422);
                }

            } catch (\Exception $e) {
                Log::error('Face encode exception (checkout)', [
                    'message' => $e->getMessage()
                ]);
                return response()->json([
                    'error' => 'Face recognition service unavailable',
                    'details' => $e->getMessage()
                ], 500);
            }

            // Compare embeddings
            try {
                $compare = Http::timeout(30)->post("{$this->serviceUrl}/compare", [
                    'embedding1' => json_decode($stored->embedding, true),
                    'embedding2' => $encodeData['embedding']
                ]);

                Log::info('Compare response (checkout)', [
                    'status' => $compare->status(),
                    'body' => $compare->json()
                ]);

                if (!$compare->successful()) {
                    return response()->json(['error' => 'Face comparison failed'], 500);
                }

                $compareData = $compare->json();

                if (!($compareData['match'] ?? false)) {
                    Log::warning('Face mismatch detected (checkout)', [
                        'user_id' => $user->id,
                        'distance' => $compareData['distance'] ?? 'unknown'
                    ]);
                    return response()->json([
                        'error' => 'Face does not match. Please try again with proper lighting.',
                        'distance' => $compareData['distance'] ?? null
                    ], 403);
                }

                Log::info('Face matched successfully (checkout)', ['user_id' => $user->id]);

            } catch (\Exception $e) {
                Log::error('Face compare exception (checkout)', [
                    'message' => $e->getMessage()
                ]);
                return response()->json([
                    'error' => 'Face comparison service unavailable',
                    'details' => $e->getMessage()
                ], 500);
            }
        }

        /**
         * 3️⃣ SAVE CHECK-OUT IMAGE (ONLY IF PROVIDED)
         */
        $imagePath = null;

        if ($request->has('image') && $request->image) {
            try {
                $imageName = "checkout_{$user->id}_" . time() . ".jpg";
                Storage::disk('public')->put("attendance/$imageName", base64_decode($request->image));
                $imagePath = "attendance/$imageName";
            } catch (\Throwable $e) {
                Log::error('Image save failed (checkout)', ['error' => $e->getMessage()]);
                return response()->json(['error' => 'Failed to save image'], 500);
            }
        }

        /**
         * 4️⃣ GEOFENCE CHECK
         */
        $fence = GeofenceService::validateLocation($user, $request->lat, $request->lng);
        $inside = $fence['inside'] ?? false;
        $distance = $fence['distance'] ?? null;

        // If "allow outside" enabled → override inside=true
        if ($settings->allow_outside_geofence) {
            $inside = true;
        }

        /**
         * 5️⃣ GPS SPOOF DETECTION (ONLY IF ENABLED)
         */
        $isAnomaly = false;

        if ($settings->gps_spoof_check_enabled) {
            $isAnomaly = SpoofDetectionService::isSpoofed($user, $request->lat, $request->lng);
        }

        /**
         * 6️⃣ UPDATE ATTENDANCE RECORD
         */
        $attendance->update([
            'check_out_time'        => now()->format('H:i:s'),
            'check_out_image'       => $imagePath,
            'check_out_lat'         => $request->lat,
            'check_out_lng'         => $request->lng,
            'is_inside_fence'       => $inside,
            'distance_from_fence_m' => $distance,
            'is_anomaly'            => $isAnomaly,
            'device_id'             => $request->device_id ?? $attendance->device_id,
        ]);

        /**
         * 7️⃣ SAVE LOCATION POINT
         */
        EmployeeLocation::create([
            'user_id'       => $user->id,
            'attendance_id' => $attendance->id,
            'lat'           => $request->lat,
            'lng'           => $request->lng,
            'device_id'     => $request->device_id,
            'recorded_at'   => now(),
        ]);

        /**
         * 8️⃣ ALERTS (ONLY IF OUTSIDE NOT ALLOWED)
         */
        if (!$inside && !$settings->allow_outside_geofence) {
            Alert::create([
                'user_id'       => $user->id,
                'attendance_id' => $attendance->id,
                'type'          => 'outside_fence',
                'title'         => 'Outside Geofence (Checkout)',
                'message'       => 'User checked out outside the assigned geofence.'
            ]);
        }

        if ($isAnomaly) {
            Alert::create([
                'user_id'       => $user->id,
                'attendance_id' => $attendance->id,
                'type'          => 'spoof_detected',
                'title'         => 'Possible Spoof/Anomaly (Checkout)',
                'message'       => 'Spoof detection flagged this checkout.'
            ]);
        }

        /**
         * 9️⃣ CALCULATE WORKED HOURS + OT
         */
        $checkIn = Carbon::parse($attendance->date . ' ' . $attendance->check_in_time);
        $checkOut = now();

        $workedHours = round($checkOut->diffInMinutes($checkIn) / 60, 2);
        $otHours = max(0, $workedHours - 8);

        Log::info('Check-out successful', ['attendance_id' => $attendance->id]);

        return response()->json([
            'status'       => true,
            'message'      => 'Check-out successful',
            'data'         => $attendance,
            'worked_hours' => $workedHours,
            'ot_hours'     => $otHours,
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
