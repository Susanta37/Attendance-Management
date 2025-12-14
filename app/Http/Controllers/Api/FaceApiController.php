<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserFaceEmbedding;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class FaceApiController extends Controller
{
    public function enrollFace(Request $request)
    {
        $request->validate([
            'image' => 'required|string',   // base64 string from Flutter
        ]);

        $user = $request->user();

        // 1️⃣ Check if already enrolled
        if ($user->face) {
            return response()->json([
                'status' => false,
                'message' => 'Face already enrolled.',
            ], 409);
        }

        // 2️⃣ Send image to Python server to generate embedding
        $pythonResponse = Http::post('http://139.59.42.28/encode', [
            'image' => $request->image,
        ]);

        if ($pythonResponse->failed()) {
            return response()->json([
                'status' => false,
                'message' => 'Face processing failed. Try again.',
            ], 500);
        }

        $embedding = $pythonResponse->json()['embedding'] ?? null;

        if (!$embedding) {
            return response()->json([
                'status' => false,
                'message' => 'Invalid embedding response from server.',
            ], 500);
        }

        // 3️⃣ Save face image
        $imageBase64 = $request->image;
        $imageData = base64_decode(explode(',', $imageBase64)[1]);

        $path = "faces/user-{$user->id}.jpg";
        Storage::disk('public')->put($path, $imageData);

        // 4️⃣ Save embedding to DB
        UserFaceEmbedding::create([
            'user_id' => $user->id,
            'embedding' => json_encode($embedding),
            'registered_image' => $path,
        ]);

        // 5️⃣ Update user: mark first login completed
        $user->is_first_login = 1;
        $user->save();

        return response()->json([
            'status' => true,
            'message' => 'Face enrolled successfully!',
            'is_first_login' => $user->is_first_login,
        ], 200);
    }
}