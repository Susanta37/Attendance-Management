<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Role;
use App\Models\User;
use App\Models\EmployeeLocation;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\FacadesLog;
use Inertia\Inertia;

class AdminAttendanceController extends Controller
{
    public function index(Request $request)
    {
        // 1. Apply Date Filter (Default to today)
        $date = $request->input('date', Carbon::today()->toDateString());

        // 2. Base Query with Enhanced Relationships
        $query = Attendance::with([
            'user.role',
            'user.settings'
        ])->whereDate('date', $date);

        // 3. Apply Search Filter (Name or Email)
        if ($request->filled('search')) {
            $query->whereHas('user', function($q) use ($request) {
                $q->where('name', 'like', '%'.$request->search.'%')
                  ->orWhere('email', 'like', '%'.$request->search.'%');
            });
        }

        // 4. Apply Role Filter
        if ($request->filled('role_id')) {
            $query->whereHas('user', function($q) use ($request) {
                $q->where('role_id', $request->role_id);
            });
        }

        // 5. Apply User Filter
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // 6. Get Latest Attendance Per User for the selected date
        // Group by user_id and get the latest attendance record for each
        $attendances = $query->latest('check_in_time')
            ->get()
            ->groupBy('user_id')
            ->map(function ($userAttendances) {
                // Return all attendance records for this user on this date
                return $userAttendances->values();
            })
            ->flatten()
            ->values();

        // 7. Calculate KPI Statistics
        $stats = [
            // Present Today: Count attendances with check-in time
            'total_present' => Attendance::whereDate('date', $date)
                ->whereNotNull('check_in_time')
                ->distinct('user_id')
                ->count('user_id'),

            // Anomalies: Count anomaly records
            'anomalies' => Attendance::whereDate('date', $date)
                ->where('is_anomaly', true)
                ->count(),

            // Active Staff: Total active users (not soft deleted)
            'active_staff' => User::whereNull('deleted_at')->count(),

            // Late Arrivals: Static for now (as per requirements)
            'late_arrivals' => null, // Frontend will show static value
        ];

        // 8. Get Roles for Filter Dropdown
        $roles = Role::select('id', 'name', 'slug')->get();

        // 9. Get Users for Filter Dropdown (Excluding Super Admin)
        $users = User::whereHas('role', function($q) {
            $q->where('slug', '!=', 'superadmin');
        })
        ->select('id', 'name', 'email')
        ->orderBy('name')
        ->get();

        // 10. Return to React
        return Inertia::render('SuperAdmin/Attendances/Index', [
            'attendances' => $this->transformImageUrls($attendances),
            'statistics' => $stats,
            'roles' => $roles,
            'users' => $users,
            'filters' => $request->only(['search', 'role_id', 'user_id', 'date']),
        ]);
    }

    /**
     * Transform relative image paths to full URLs and format times as strings
     */
   /**
 * Transform relative image paths to full URLs and format times as strings
 */
// AdminAttendanceController.php

private function transformImageUrls($attendances)
{
    return $attendances->map(function ($attendance) {
        // 1. Handle Images
        if ($attendance->check_in_image) {
            $attendance->check_in_image = asset('storage/' . $attendance->check_in_image);
        }
        if ($attendance->check_out_image) {
            $attendance->check_out_image = asset('storage/' . $attendance->check_out_image);
        }

        // 2. Safe Date Merge Logic
        // We first force the time into a clean 'H:i:s' format to remove any "accidental" dates.
        // Then we attach the correct date from the 'date' column.

        try {
            if ($attendance->date && $attendance->check_in_time) {
                $dateStr = \Carbon\Carbon::parse($attendance->date)->format('Y-m-d');
                $timeStr = \Carbon\Carbon::parse($attendance->check_in_time)->format('H:i:s');
                $attendance->check_in_time = $dateStr . ' ' . $timeStr;
            }

            if ($attendance->date && $attendance->check_out_time) {
                $dateStr = \Carbon\Carbon::parse($attendance->date)->format('Y-m-d');
                $timeStr = \Carbon\Carbon::parse($attendance->check_out_time)->format('H:i:s');
                $attendance->check_out_time = $dateStr . ' ' . $timeStr;
            }
        } catch (\Exception $e) {
            // Fallback: If parsing fails, leave the original value so the app doesn't crash
            // Log::error("Date Parse Error: " . $e->getMessage());
        }

        return $attendance;
    });
}
    /**
     * Get all attendance records for a specific user on a specific date
     * Used for verification modal when user has multiple check-ins
     */
    public function getUserAttendances(Request $request, $userId)
    {
        $date = $request->input('date', Carbon::today()->toDateString());

        $attendances = Attendance::with(['user.role'])
            ->where('user_id', $userId)
            ->whereDate('date', $date)
            ->orderBy('check_in_time', 'desc')
            ->get();

        return response()->json($this->transformImageUrls($attendances));
    }

    /**
     * Get live location data for a user
     * Fetches from employee_locations table
     */
   public function getLiveLocation(Request $request, $userId)
{
    $attendanceId = $request->input('attendance_id');

    Log::info('Live Location Query', [
        'user_id' => $userId,
        'attendance_id' => $attendanceId,
    ]);

    $query = EmployeeLocation::where('user_id', $userId);

    if ($attendanceId) {
        $query->where('attendance_id', $attendanceId);
    }

    $locations = $query
            ->orderBy('recorded_at', 'asc')
            ->get([
                'id', 
                'lat', 
                'lng', 
                'speed', 
                'accuracy', 
                'battery', 
                'recorded_at', 
                'name', 
                'time_spent_seconds'
            ]);

    Log::info('Live Location Results', [
        'count' => $locations->count(),
        'first_location' => $locations->first(),
    ]);

    return response()->json([
        'locations' => $locations,
        'total_distance' => $this->calculateTotalDistance($locations),
    ]);
}


    /**
     * Calculate total distance traveled from location pings
     * Using Haversine formula
     */
    private function calculateTotalDistance($locations)
    {
        if ($locations->count() < 2) {
            return 0;
        }

        $totalDistance = 0;

        for ($i = 0; $i < $locations->count() - 1; $i++) {
            $point1 = $locations[$i];
            $point2 = $locations[$i + 1];

            $totalDistance += $this->haversineDistance(
                $point1->lat,
                $point1->lng,
                $point2->lat,
                $point2->lng
            );
        }

        return round($totalDistance, 2); // in kilometers
    }

    /**
     * Calculate distance between two lat/lng points using Haversine formula
     * Returns distance in kilometers
     */
    private function haversineDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371; // Radius of the earth in km

        $latDelta = deg2rad($lat2 - $lat1);
        $lonDelta = deg2rad($lon2 - $lon1);

        $a = sin($latDelta / 2) * sin($latDelta / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($lonDelta / 2) * sin($lonDelta / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }
}
