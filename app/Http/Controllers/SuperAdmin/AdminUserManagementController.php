<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\User;
use App\Models\Role;
use App\Models\Department;
use App\Models\UserDocument;
use App\Models\UserSetting;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AdminUserManagementController extends Controller
{
    /**
     * Display the user management page with data
     */
    public function index(Request $request)
    {
        // ------------------------------------
        // KPI CALCULATION (DYNAMIC)
        // ------------------------------------
        $totalUsers = User::count();
        $activeToday = Attendance::whereDate('check_in_time', Carbon::today())->distinct('user_id')->count();
        $pendingApproval = UserDocument::where('verification_status', 'pending')->count();
        
        // This is a placeholder as 'GPS Violations' data structure is missing, 
        // but assumes a settings table field or a violation log exists.
        // For demonstration, we'll check users who haven't enabled spoof check.
        $gpsViolations = User::whereHas('settings', function($query) {
             $query->where('gps_spoof_check_enabled', false);
        })->count();

        $dynamicStats = [
            'totalUsers' => number_format($totalUsers),
            'activeToday' => number_format($activeToday),
            'pendingApproval' => number_format($pendingApproval),
            'gpsViolations' => number_format($gpsViolations),
        ];
        // ------------------------------------

        // Build query with filters
        $query = User::with(['role', 'department', 'settings', 'documents', 'faceEmbedding'])
            ->withTrashed();

        // Apply role filter
        if ($request->filled('role_id')) {
            $query->where('role_id', $request->role_id);
        }

        // Apply location filters
        // ... (existing location filters)

        // Apply search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->latest()->paginate(15);

        // Get all roles
        $roles = Role::all(['id', 'name', 'slug']);

        // Get all departments
        $departments = Department::all(['id', 'name', 'parent_id', 'type']);

        // Get user settings schema (exclude shift_start and shift_end)
        $userSettingsSchema = [
            // ... (existing schema array)
            [
                'key' => 'face_verification_enabled',
                'label' => 'Face Verification',
                'type' => 'boolean',
                'default' => true
            ],
            [
                'key' => 'gps_spoof_check_enabled',
                'label' => 'GPS Spoof Check',
                'type' => 'boolean',
                'default' => true
            ],
            [
                'key' => 'multiple_attendance_allowed',
                'label' => 'Multiple Attendance',
                'type' => 'boolean',
                'default' => false
            ],
            [
                'key' => 'allow_outside_geofence',
                'label' => 'Allow Outside Geofence',
                'type' => 'boolean',
                'default' => false
            ],
            [
                'key' => 'live_tracking_enabled',
                'label' => 'Live Tracking',
                'type' => 'boolean',
                'default' => false
            ],
        ];

        // Return inertia view for page load or JSON for API call
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'users' => $users,
                'roles' => $roles,
                'departments' => $departments,
                'userSettingsSchema' => $userSettingsSchema,
                'dynamicStats' => $dynamicStats, // Return dynamic stats for reloads
            ]);
        }

        return inertia('SuperAdmin/UserManagement/Index', [
            'initialUsers' => $users,
            'roles' => $roles,
            'departments' => $departments,
            'userSettingsSchema' => $userSettingsSchema,
            'dynamicStats' => $dynamicStats, // Pass dynamic stats to Inertia
        ]);
    }

    /**
     * Store a newly created user
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'phone' => ['required', 'string', 'max:15', 'unique:users'],
            'password' => ['required', Password::defaults()],
            'role_id' => ['required', 'exists:roles,id'],
            'department_id' => ['required', 'exists:departments,id'],
            'address' => ['nullable', 'string'],
            'district' => ['nullable', 'string', 'max:255'],
            'block' => ['nullable', 'string', 'max:255'],
            'gram_panchayat' => ['nullable', 'string', 'max:255'],
            'pincode' => ['nullable', 'string', 'size:6'],
            'settings' => ['nullable', 'array'],
        ]);

        // Create user
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'password' => Hash::make($validated['password']),
            'role_id' => $validated['role_id'],
            'department_id' => $validated['department_id'],
            'address' => $validated['address'] ?? null,
            'district' => $validated['district'] ?? null,
            'block' => $validated['block'] ?? null,
            'gram_panchayat' => $validated['gram_panchayat'] ?? null,
            'pincode' => $validated['pincode'] ?? null,
            'status' => 'active',
        ]);

        // Create user settings
        if (isset($validated['settings'])) {
            UserSetting::create(array_merge(
                ['user_id' => $user->id],
                $validated['settings']
            ));
        } else {
            // Create default settings
            UserSetting::create([
                'user_id' => $user->id,
                'face_verification_enabled' => true,
                'gps_spoof_check_enabled' => true,
                'multiple_attendance_allowed' => false,
                'allow_outside_geofence' => false,
                'live_tracking_enabled' => false,
            ]);
        }

        // Load relationships
        $user->load(['role', 'department', 'settings', 'documents', 'faceEmbedding']);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user,
        ], 201);
    }

    /**
     * Update the specified user
     */
    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'phone' => ['required', 'string', 'max:15', 'unique:users,phone,' . $user->id],
            'password' => ['nullable', Password::defaults()],
            'role_id' => ['required', 'exists:roles,id'],
            'department_id' => ['required', 'exists:departments,id'],
            'address' => ['nullable', 'string'],
            'district' => ['nullable', 'string', 'max:255'],
            'block' => ['nullable', 'string', 'max:255'],
            'gram_panchayat' => ['nullable', 'string', 'max:255'],
            'pincode' => ['nullable', 'string', 'size:6'],
            'settings' => ['nullable', 'array'],
        ]);

        // Update user
        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'role_id' => $validated['role_id'],
            'department_id' => $validated['department_id'],
            'address' => $validated['address'] ?? null,
            'district' => $validated['district'] ?? null,
            'block' => $validated['block'] ?? null,
            'gram_panchayat' => $validated['gram_panchayat'] ?? null,
            'pincode' => $validated['pincode'] ?? null,
        ]);

        // Update password if provided
        if (!empty($validated['password'])) {
            $user->update(['password' => Hash::make($validated['password'])]);
        }

        // Update user settings
        if (isset($validated['settings'])) {
            $user->settings()->updateOrCreate(
                ['user_id' => $user->id],
                $validated['settings']
            );
        }

        // Reload relationships
        $user->load(['role', 'department', 'settings', 'documents', 'faceEmbedding']);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user,
        ]);
    }

    /**
     * Soft delete (deactivate) the specified user
     */
    public function destroy(User $user)
    {
        $user->delete();

        return response()->json([
            'message' => 'User deactivated successfully',
        ]);
    }

    /**
     * Restore soft deleted user (activate)
     */
    public function restore($userId)
    {
        $user = User::withTrashed()->findOrFail($userId);
        $user->restore();

        return response()->json([
            'message' => 'User activated successfully',
            'user' => $user->load(['role', 'department', 'settings', 'documents', 'faceEmbedding']),
        ]);
    }
}
