<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserFaceEmbedding;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class FaceApiController extends Controller
{
    public function enrollFace(Request $request)
    {
        Log::info('Face Enrollment: Request received');

        // 1️⃣ Validate request
        $request->validate([
            'image' => 'required|string',
        ]);

        $user = $request->user();

        Log::info('Face Enrollment: User identified', [
            'user_id' => $user->id,
            'email'   => $user->email,
        ]);

        // 2️⃣ Check if face already enrolled
        if ($user->face) {
            Log::warning('Face Enrollment: Face already exists', [
                'user_id' => $user->id,
            ]);

            return response()->json([
                'status' => false,
                'message' => 'Face already enrolled.',
            ], 409);
        }

        // 3️⃣ Send image to Python server
        Log::info('Face Enrollment: Sending image to Python server');

        try {
            $pythonResponse = Http::timeout(15)->post('http://kendrapada.nexprodigitalschool.com/encode', [
                'image' => $request->image,
            ]);
        } catch (\Exception $e) {
            Log::error('Face Enrollment: Python server connection failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => false,
                'message' => 'Unable to connect to face service.',
            ], 500);
        }

        if ($pythonResponse->failed()) {
            Log::error('Face Enrollment: Python server returned error', [
                'status' => $pythonResponse->status(),
                'body'   => $pythonResponse->body(),
            ]);

            return response()->json([
                'status' => false,
                'message' => 'Face processing failed. Try again.',
            ], 500);
        }

        $responseData = $pythonResponse->json();
        $embedding = $responseData['embedding'] ?? null;

        Log::info('Face Enrollment: Python response received', [
            'has_embedding' => !empty($embedding),
        ]);

        if (!$embedding) {
            Log::error('Face Enrollment: Embedding missing in response', [
                'response' => $responseData,
            ]);

            return response()->json([
                'status' => false,
                'message' => 'Invalid embedding response from server.',
            ], 500);
        }

        // 4️⃣ Save face image
        try {
            $imageBase64 = $request->image;
            $imageData = base64_decode(explode(',', $imageBase64)[1]);

            $path = "faces/user-{$user->id}.jpg";
            Storage::disk('public')->put($path, $imageData);

            Log::info('Face Enrollment: Face image saved', [
                'path' => $path,
            ]);
        } catch (\Exception $e) {
            Log::error('Face Enrollment: Failed to save image', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => false,
                'message' => 'Failed to save face image.',
            ], 500);
        }

        // 5️⃣ Save embedding to DB
        try {
            UserFaceEmbedding::create([
                'user_id'          => $user->id,
                'embedding'        => json_encode($embedding),
                'registered_image' => $path,
            ]);

            Log::info('Face Enrollment: Embedding saved to database', [
                'user_id' => $user->id,
            ]);
        } catch (\Exception $e) {
            Log::error('Face Enrollment: Database insert failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => false,
                'message' => 'Failed to save face data.',
            ], 500);
        }

        // 6️⃣ Update first login flag
        $user->is_first_login = 1;
        $user->save();

        Log::info('Face Enrollment: First login flag updated', [
            'user_id' => $user->id,
            'is_first_login' => $user->is_first_login,
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Face enrolled successfully!',
            'is_first_login' => $user->is_first_login,
        ], 200);
    }
}