<?php

namespace App\Http\Responses;

use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Illuminate\Support\Facades\Auth;

class LoginResponse implements LoginResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function toResponse($request)
    {
        $user = Auth::user();

        // Redirect based on Role Slug
        if ($user->hasRole('collector') || $user->hasRole('district_admin')) {
            return redirect()->intended(route('admin.dashboard'));
        }

        if ($user->hasRole('department_manager')) {
            return redirect()->intended(route('manager.dashboard'));
        }

        // Default Employee Dashboard
        return redirect()->intended(route('dashboard'));
    }
}