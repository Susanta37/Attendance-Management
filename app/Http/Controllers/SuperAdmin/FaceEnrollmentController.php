<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserFaceEmbedding;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class FaceEnrollmentController extends Controller
{
    /**
     * Enroll face for a specific user (admin action)
     */
    public function enroll(Request $request, $userId)
    {
        $request->validate([
            'image' => 'required|string', // base64 image
        ]);

        $user = User::findOrFail($userId);

        // Check if already enrolled
        if ($user->faceEmbedding) {
            return response()->json([
                'success' => false,
                'message' => 'Face already enrolled. Use re-enroll instead.',
            ], 409);
        }

        return $this->processFaceEnrollment($user, $request->image, false);
    }

    /**
     * Re-enroll face for a specific user (admin action - update existing)
     */
    public function reEnroll(Request $request, $userId)
    {
        $request->validate([
            'image' => 'required|string', // base64 image
        ]);

        $user = User::findOrFail($userId);

        return $this->processFaceEnrollment($user, $request->image, true);
    }

    /**
     * Delete face enrollment for a user
     */
    public function deleteFace($userId)
    {
        $user = User::findOrFail($userId);

        if (!$user->faceEmbedding) {
            return response()->json([
                'success' => false,
                'message' => 'No face enrollment found for this user.',
            ], 404);
        }

        // Delete the image file
        if ($user->faceEmbedding->registered_image) {
            Storage::disk('public')->delete($user->faceEmbedding->registered_image);
        }

        // Delete the embedding record
        $user->faceEmbedding->delete();

        return response()->json([
            'success' => true,
            'message' => 'Face enrollment deleted successfully.',
        ]);
    }

    /**
     * Get face enrollment status for a user
     */
    public function status($userId)
    {
        $user = User::with('faceEmbedding')->findOrFail($userId);

        return response()->json([
            'success' => true,
            'has_face' => $user->faceEmbedding !== null,
            'face_data' => $user->faceEmbedding ? [
                'registered_image' => $user->faceEmbedding->registered_image,
                'created_at' => $user->faceEmbedding->created_at,
                'updated_at' => $user->faceEmbedding->updated_at,
            ] : null,
        ]);
    }

    /**
     * Private helper to process face enrollment
     */
 private function processFaceEnrollment(User $user, string $imageBase64, bool $isReEnroll)
{
    // 1️⃣ Normalize image
    if (str_starts_with($imageBase64, 'data:image')) {
        $imageBase64 = substr($imageBase64, strpos($imageBase64, ',') + 1);
    }

    $imageBase64 = str_replace(' ', '+', $imageBase64);
    $imageData = base64_decode($imageBase64);

    if ($imageData === false) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid image data',
        ], 422);
    }

    // 2️⃣ Call Python face service
    $pythonResponse = Http::timeout(30)->post('http://139.59.42.28/encode', [
        'image' => 'data:image/jpeg;base64,' . base64_encode($imageData),
    ]);

    if ($pythonResponse->failed()) {
        Log::error('Face API failed', [
            'status' => $pythonResponse->status(),
            'body' => $pythonResponse->body(),
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Face service unavailable',
        ], 500);
    }

    $response = $pythonResponse->json();

    // 3️⃣ Extract embedding
    $embedding = $response['embedding'] ?? $response['data']['embedding'] ?? null;

    if (!$embedding || !is_array($embedding)) {
        return response()->json([
            'success' => false,
            'message' => 'No face detected. Please capture a clear face.',
        ], 422);
    }

    // 4️⃣ Save image
    $path = "faces/user-{$user->id}.jpg";
    Storage::disk('public')->put($path, $imageData);

    // 5️⃣ Save embedding
    UserFaceEmbedding::updateOrCreate(
        ['user_id' => $user->id],
        [
            'embedding' => json_encode($embedding),
            'registered_image' => $path,
        ]
    );

    return response()->json([
        'success' => true,
        'message' => $isReEnroll
            ? 'Face re-enrolled successfully'
            : 'Face enrolled successfully',
        'face_data' => [
            'registered_image' => $path,
        ],
    ]);
}


}
