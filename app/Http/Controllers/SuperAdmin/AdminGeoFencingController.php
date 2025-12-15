<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Geofence;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Services\GeofenceService; 

class AdminGeoFencingController extends Controller
{
    protected $geofenceService;

    public function __construct(GeofenceService $geofenceService)
    {
        $this->geofenceService = $geofenceService;
    }

    public function index()
    {
        // 1. Fetch Existing Geofences with relationships
        $geofences = Geofence::with(['departments:id,name', 'users:id,name'])
            ->latest()
            ->get()
            ->map(function ($geo) {
                // Determine assignment label
                $assign = 'Unassigned';
                $type = 'unassigned';

                if ($geo->departments->isNotEmpty()) {
                    $type = 'department';
                    $assign = $geo->departments->pluck('name')->join(', ');
                } elseif ($geo->users->isNotEmpty()) {
                    $type = 'employee';
                    $assign = $geo->users->pluck('name')->join(', ');
                }

                return [
                    'id' => $geo->id,
                    'name' => $geo->name,
                    'type' => $type,
                    'assign' => $assign,
                    'location' => "{$geo->dist} > {$geo->block}",
                    'status' => 'active', // Assuming all are active for now
                    'shape' => ucfirst($geo->shape_type),
                    'coordinates' => $geo->coordinates,
                    'radius' => $geo->radius,
                ];
            });

        // 2. Fetch Options for Dropdowns
        $departments = Department::select('id', 'name')->get();
        // Fetch only relevant employees (e.g., exclude super admins if needed)
        $employees = User::where('role_id', '!=', 1)->select('id', 'name')->get();

        return Inertia::render('SuperAdmin/GeoFencing/Index', [
            'geofences' => $geofences,
            'departments' => $departments,
            'employees' => $employees,
        ]);
    }

    public function store(Request $request)
    {
        // 1. Validate Input
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'dist' => 'required|string',
            'block' => 'nullable|string',
            'shape_type' => 'required|in:circle,polygon,rectangle',
            'coordinates' => 'required|array',
            'radius' => 'nullable|numeric',
            'assign_type' => 'required|in:department,employee',
            'assignee_ids' => 'required|array',
            'assignee_ids.*' => 'integer', // Ensure IDs are integers
        ]);

        // 2. Use Service to Create
        $this->geofenceService->createGeofence($validated);

        // 3. Redirect back (Inertia handles the page reload automatically)
        return redirect()->back()->with('success', 'Geofence created successfully.');
    }
    
    // Add delete/update methods here later
    public function destroy(Geofence $geofence)
    {
        $geofence->delete();
        return redirect()->back()->with('success', 'Geofence deleted successfully.');
    }
}