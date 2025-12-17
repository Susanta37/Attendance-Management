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
        // 1. Clean the Base64 String
        if (str_contains($imageBase64, 'base64,')) {
            $exploded = explode(',', $imageBase64);
            $cleanBase64 = end($exploded); // Get the part after 'base64,'
        } else {
            $cleanBase64 = $imageBase64;
        }
        
        // Fix standard base64 issues
        $cleanBase64 = str_replace(' ', '+', $cleanBase64);

        // Decode to binary for file storage
        $imageData = base64_decode($cleanBase64);

        if ($imageData === false) {
            return response()->json(['success' => false, 'message' => 'Invalid image data format'], 422);
        }

        // 2. Call Python Face Service
        // We send the 'cleanBase64' directly if the API expects raw base64, 
        // OR format it as Data URI if API expects that.
        // Assuming API expects: "data:image/jpeg;base64,....."
        $apiPayload = 'data:image/jpeg;base64,' . $cleanBase64;

        try {
            $response = Http::timeout(10)->post('http://kendrapada.nexprodigitalschool.com/encode', [
                'image' => $apiPayload,
            ]);
        } catch (\Exception $e) {
            Log::error("Face Service Connection Error: " . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Could not connect to Face Service.'], 500);
        }

        // 3. Debugging Logs (Check storage/logs/laravel.log)
        if ($response->failed()) {
            Log::error('Face API Error', ['status' => $response->status(), 'body' => $response->body()]);
            return response()->json(['success' => false, 'message' => 'Face Service Error: ' . $response->status()], 500);
        }

        $responseData = $response->json();
        
        // Handle cases where API returns success: false
        if (isset($responseData['success']) && $responseData['success'] === false) {
            return response()->json(['success' => false, 'message' => $responseData['message'] ?? 'Face detection failed'], 422);
        }

        // Extract Embedding
        $embedding = $responseData['embedding'] ?? $responseData['data']['embedding'] ?? null;

        if (!$embedding || !is_array($embedding)) {
            Log::error('Missing Embedding in Response', ['response' => $responseData]);
            return response()->json(['success' => false, 'message' => 'No face detected in the image.'], 422);
        }

        // 4. Save Image to Disk
        $fileName = "faces/user-{$user->id}-" . time() . ".jpg";
        Storage::disk('public')->put($fileName, $imageData);

        // 5. Save to Database
        // Ensure UserFaceEmbedding model has: protected $casts = ['embedding' => 'array'];
        UserFaceEmbedding::updateOrCreate(
            ['user_id' => $user->id],
            [
                'embedding' => $embedding, // Let Laravel cast handle JSON encoding
                'registered_image' => $fileName,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => $isReEnroll ? 'Face re-enrolled successfully' : 'Face enrolled successfully',
            'face_data' => [
                'registered_image' => asset('storage/' . $fileName),
            ],
        ]);
    }


}
