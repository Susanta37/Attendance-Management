<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Geofence;
use App\Models\Department;
use App\Models\User;
use App\Models\District; // Import District
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
        $geofences = Geofence::with(['departments:id,name', 'users:id,name'])
            ->latest()
            ->get()
            ->map(function ($geo) {
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
                    'location' => "{$geo->dist} > {$geo->block}", // You might want to map IDs to names here if storing IDs
                    'status' => 'active',
                    'shape' => ucfirst($geo->shape_type),
                    'coordinates' => $geo->coordinates,
                    'radius' => $geo->radius,
                ];
            });

        $departments = Department::select('id', 'name')->get();
        $employees = User::where('role_id', '!=', 1)->select('id', 'name')->get();
        
        // --- ADDED: Fetch Active Districts ---
        $districts = District::where('is_active', 1)->select('pk_district_id as id', 'district_name as name')->get();

        return Inertia::render('SuperAdmin/GeoFencing/Index', [
            'geofences' => $geofences,
            'departments' => $departments,
            'employees' => $employees,
            'districts' => $districts, // Pass to View
        ]);
    }

    public function store(Request $request)
    {
        // Debugging: Uncomment to see what data is actually hitting the server
        // dd($request->all()); 

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'dist' => 'required', // Accepts ID or String depending on your DB
            'block' => 'nullable',
            'shape_type' => 'required|in:circle,polygon,rectangle',
            'coordinates' => 'required|array',
            'radius' => 'nullable|numeric',
            'assign_type' => 'required|in:department,employee',
            'assignee_ids' => 'required|array|min:1', // Ensure at least one assignee
            'assignee_ids.*' => 'integer',
        ]);

        $this->geofenceService->createGeofence($validated);

        return redirect()->back()->with('success', 'Geofence created successfully.');
    }

    public function destroy(Geofence $geofence)
    {
        $geofence->delete();
        return redirect()->back()->with('success', 'Geofence deleted successfully.');
    }
}