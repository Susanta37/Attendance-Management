<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('attendance.live.{userId}', function ($user, $userId) {
    // Authorized if: User is Admin OR User is tracking themselves
    return $user->hasRole(['collector', 'district_admin', 'super_admin', 'department_manager']) 
           || (int) $user->id === (int) $userId;
});
Broadcast::channel('admin.dashboard', function ($user) {
    
    return $user->hasRole(['collector', 'district_admin', 'super_admin', 'department_manager']);
});