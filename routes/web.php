<?php

use App\Http\Controllers\Manager\ManagerDashboardController;
use App\Http\Controllers\SuperAdmin\AdminAttendanceController;
use App\Http\Controllers\SuperAdmin\AdminDashboardController;
use App\Http\Controllers\SuperAdmin\AdminGeoFencingController;
use App\Http\Controllers\SuperAdmin\AdminUserManagementController;
use App\Http\Controllers\SuperAdmin\AdminReportsController;
use App\Http\Controllers\SuperAdmin\AdminMasterDataController;
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

Route::get('/api/blocks/{districtId}', [AdminUserManagementController::class, 'getBlocks']);
Route::get('/api/gps/{blockId}', [AdminUserManagementController::class, 'getGps']);

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
             Route::get('/geofences', [AdminGeoFencingController::class, 'index'])->name('geofencing');
             Route::prefix('geofences')->name('geofences.')->group(function () {
             Route::post('/', [AdminGeoFencingController::class, 'store'])->name('store');
             Route::put('/{geofence}', [AdminGeoFencingController::class, 'update'])->name('update');
             Route::delete('/{geofence}', [AdminGeoFencingController::class, 'destroy'])->name('destroy');
         });
            Route::get('/masterdata', [AdminMasterDataController::class, 'index'])->name('masterdata.index');
            Route::post('/departments', [AdminMasterDataController::class, 'storeDepartment'])->name('departments.store');
            Route::post('/users-create', [AdminMasterDataController::class, 'storeUser'])->name('users.store.master'); // Distinct name
            Route::post('/roles', [AdminMasterDataController::class, 'storeRole'])->name('roles.store');
            
             Route::get('/users', [AdminUserManagementController::class, 'index'])->name('user_management');
             Route::get('/attendance', [AdminAttendanceController::class, 'index'])->name('attendance');
             Route::get('/attendance/{userId}/records', [AdminAttendanceController::class, 'getUserAttendances'])->name('attendance.user_records');
             Route::get('/attendance/{userId}/live-location', [AdminAttendanceController::class, 'getLiveLocation'])->name('attendance.live_location');
             Route::get('/reports', [AdminReportsController::class, 'index'])->name('reports');
             Route::get('/reports/{id}/download', [AdminReportsController::class, 'download'])->name('reports.download');
             Route::get('/masterdata', [AdminMasterDataController::class, 'index'])->name('masterdata');
             
             // User Management API Routes
             Route::prefix('users')->name('users.')->group(function () {
                 Route::post('/', [\App\Http\Controllers\SuperAdmin\AdminUserManagementController::class, 'store'])->name('store');
                 Route::put('/{user}', [\App\Http\Controllers\SuperAdmin\AdminUserManagementController::class, 'update'])->name('update');
                 Route::delete('/{user}', [\App\Http\Controllers\SuperAdmin\AdminUserManagementController::class, 'destroy'])->name('destroy');
                 Route::post('/{user}/restore', [\App\Http\Controllers\SuperAdmin\AdminUserManagementController::class, 'restore'])->name('restore');
                 
                 // Document Management
                 Route::get('/{user}/documents', [\App\Http\Controllers\SuperAdmin\UserDocumentController::class, 'index'])->name('documents.index');
                 Route::post('/{user}/documents', [\App\Http\Controllers\SuperAdmin\UserDocumentController::class, 'store'])->name('documents.store');
                 Route::put('/documents/{document}', [\App\Http\Controllers\SuperAdmin\UserDocumentController::class, 'update'])->name('documents.update');
                 Route::post('/documents/{document}/approve', [\App\Http\Controllers\SuperAdmin\UserDocumentController::class, 'approve'])->name('documents.approve');
                 Route::post('/documents/{document}/reject', [\App\Http\Controllers\SuperAdmin\UserDocumentController::class, 'reject'])->name('documents.reject');
                 Route::delete('/documents/{document}', [\App\Http\Controllers\SuperAdmin\UserDocumentController::class, 'destroy'])->name('documents.destroy');
                 
                 // Face Enrollment (Admin manages user faces)
                 Route::post('/{user}/face/enroll', [\App\Http\Controllers\SuperAdmin\FaceEnrollmentController::class, 'enroll'])->name('face.enroll');
                 Route::post('/{user}/face/re-enroll', [\App\Http\Controllers\SuperAdmin\FaceEnrollmentController::class, 'reEnroll'])->name('face.reenroll');
                 Route::delete('/{user}/face', [\App\Http\Controllers\SuperAdmin\FaceEnrollmentController::class, 'deleteFace'])->name('face.delete');
                 Route::get('/{user}/face/status', [\App\Http\Controllers\SuperAdmin\FaceEnrollmentController::class, 'status'])->name('face.status');
             });
             
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
