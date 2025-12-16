<?php

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AttendanceHistoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EmployeeAuthController;
use App\Http\Controllers\Api\FaceApiController;
use App\Http\Controllers\Api\ProfileController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


Route::post('/employee/login', [EmployeeAuthController::class, 'login'])
    ->name('employee.login');




/*
|--------------------------------------------------------------------------
| Protected Employee Routes (Sanctum Required)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // Logout
    Route::post('/employee/logout', [EmployeeAuthController::class, 'logout'])
        ->name('employee.logout');


        Route::get('/check-first-login', [EmployeeAuthController::class, 'checkFirstLogin']);
    /*
    |--------------------------------------------------------------------------
    | Attendance Routes
    |--------------------------------------------------------------------------
    */

    //Face Enroll
    Route::post('/face/enroll', [FaceApiController::class, 'enrollFace']);
    //Checkin/checkout status check
    Route::get('/attendance/status', [AttendanceController::class, 'status']);
    // Check-in API
    Route::post('/employee/check-in', [AttendanceController::class, 'checkIn'])
        ->name('employee.checkin');

    // Check-out API
    Route::post('/employee/check-out', [AttendanceController::class, 'checkOut'])
        ->name('employee.checkout');

    // Live Location API
    Route::post('/employee/live-location', [AttendanceController::class, 'liveLocation'])
        ->name('employee.livelocation');


    //User Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);
    //Attendance history
    Route::get('/attendance/history',  [AttendanceHistoryController::class, 'index']);

    Route::get('/profile',[ProfileController::class, 'show']);

});