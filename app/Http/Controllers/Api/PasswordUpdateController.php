<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Laravel\Fortify\Contracts\UpdatesUserPasswords; // The Fortify Contract

class PasswordUpdateController extends Controller
{
    /**
     * Handle the PUT /user/password API request.
     * This uses Fortify's bound action (App\Actions\Fortify\UpdateUserPassword)
     * to perform validation and update the password.
     */
    public function update(Request $request, UpdatesUserPasswords $updater)
    {
        $updater->update($request->user(), $request->all());

        return response()->json([
            'status' => true,
            'message' => 'Password updated successfully'
        ], 200);
    }
}