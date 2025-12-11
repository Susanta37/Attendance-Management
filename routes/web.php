<?php

use App\Http\Controllers\Manager\ManagerDashboardController;
use App\Http\Controllers\SuperAdmin\AdminDashboardController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Session;
use Inertia\Inertia;
use Laravel\Fortify\Features;


Route::get('language/{locale}', function ($locale) {
    if (in_array($locale, ['en', 'or'])) {
        Session::put('locale', $locale);
    }
    return redirect()->back();
})->name('language.switch');

Route::get('/', function () {
    if (Auth::check()) {
        return redirect()->route('dashboard'); // Send to the central dispatcher
    }

    return Inertia::render('welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'phpVersion' => PHP_VERSION,
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    
    Route::get('/dashboard', function () {
        $user = Auth::user();

        // ❌ Admins should NOT see the employee dashboard
        if ($user->hasRole('collector') || $user->hasRole('district_admin')) {
            return redirect()->route('admin.dashboard');
        }

        // ❌ Managers should have their own view (Future proofing)
        if ($user->hasRole('department_manager')) {
            return redirect()->route('manager.dashboard');
        }

        // ✅ Default: Render Employee Dashboard
        return Inertia::render('dashboard'); 
    })->name('dashboard');

});

Route::middleware(['role:collector,district_admin'])
         ->prefix('admin')
         ->name('admin.')
         ->group(function () {
             
             // This controller needs to be created
             Route::get('/dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');
             
             // Add Department/Geofence routes here later
    });
Route::middleware(['role:department_manager'])
         ->prefix('manager')
         ->name('manager.')
         ->group(function () {
             
             // This controller needs to be created
             Route::get('/dashboard', [ManagerDashboardController::class, 'index'])->name('dashboard');
             
             // Add Department/Geofence routes here later
    });

require __DIR__.'/settings.php';
