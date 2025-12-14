<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Department;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdminAttendanceController extends Controller
{
    public function index(Request $request)
    {
        // 1. Base Query with Relationships
        $query = Attendance::with(['user.department', 'locations' => function($q) {
            $q->orderBy('recorded_at', 'asc'); // Order breadcrumbs for timeline
        }]);

        // 2. Apply Search Filter
        if ($request->filled('search')) {
            $query->whereHas('user', function($q) use ($request) {
                $q->where('name', 'like', '%'.$request->search.'%')
                  ->orWhere('email', 'like', '%'.$request->search.'%');
            });
        }

        // 3. Apply Department Filter
        if ($request->filled('department_id')) {
            $query->whereHas('user', function($q) use ($request) {
                $q->where('department_id', $request->department_id);
            });
        }

        // 4. Apply Date Filter (Default to today)
        $date = $request->input('date', Carbon::today()->toDateString());
        $query->whereDate('date', $date);

        // 5. Get Statistics for KPI Cards
        $stats = [
            'total_present' => Attendance::whereDate('date', $date)->count(),
            
            'late_arrivals' => Attendance::whereDate('date', $date)
                ->whereTime('check_in_time', '>', '09:30:00') // Assume 9:30 AM is late
                ->count(),

            'anomalies' => Attendance::whereDate('date', $date)
                ->where('is_anomaly', true)
                ->count(),

            'on_leave' => 5 // Replace with: Leave::whereDate('start_date', '<=', $date)->whereDate('end_date', '>=', $date)->count()
        ];

        // 6. Return to React
        return Inertia::render('SuperAdmin/Attendances/Index', [
            'attendances' => $query->latest()->paginate(10)->withQueryString(),
            'statistics' => $stats,
            'departments' => Department::select('id', 'name')->get(),
            'filters' => $request->only(['search', 'department_id', 'date']),
        ]);
    }
}
