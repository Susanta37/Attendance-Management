<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Department;
use App\Models\Role; // Use Spatie or your custom model
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AdminMasterDataController extends Controller
{
    public function index()
    {
        // 1. Fetch Users
        $users = User::with(['role', 'department', 'settings'])
            ->where('role_id', '!=', 1) 
            ->latest()
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role->name ?? 'N/A',
                    'department' => $user->department->name ?? 'N/A',
                    'settings' => $user->settings, // Pass full settings object
                ];
            });

        // 2. Fetch Departments (Linear list for table, hierarchical logic handled in frontend or separate helper)
        $departments = Department::with('parent')
            ->withCount('users')
            ->get()
            ->map(function ($dept) {
                return [
                    'id' => $dept->id,
                    'name' => $dept->name,
                    'type' => $dept->type,
                    'parent' => $dept->parent ? $dept->parent->name : null,
                    'users_count' => $dept->users_count,
                ];
            });

        // 3. Fetch Roles
        $roles = Role::all()->map(function ($role) {
            return [
                'id' => $role->id,
                'name' => $role->name,
                'slug' => $role->slug ?? Str::slug($role->name),
                'permissions_count' => $role->permissions ? $role->permissions->count() : 0,
            ];
        });

        return Inertia::render('SuperAdmin/MasterData/Index', [
            'users' => $users,
            'departments' => $departments,
            'roles' => $roles,
        ]);
    }

    // --- Store Methods ---

    public function storeDepartment(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string',
            'parent_id' => 'nullable|exists:departments,id',
        ]);

        Department::create($validated);
        return redirect()->back()->with('success', 'Department created successfully.');
    }

    public function storeUser(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role_id' => 'required|exists:roles,id',
            'department_id' => 'required|exists:departments,id',
            // Add other fields like phone if needed
        ]);

        $validated['password'] = Hash::make($validated['password']);
        User::create($validated);

        return redirect()->back()->with('success', 'User created successfully.');
    }

    public function storeRole(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:roles,name',
        ]);

        // Assuming Spatie Permission or simple Role model
        $role = Role::create([
            'name' => $validated['name'], 
            'guard_name' => 'web',
            'slug' => Str::slug($validated['name'])
        ]);

        return redirect()->back()->with('success', 'Role created successfully.');
    }
}