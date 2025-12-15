<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Attendance;
use App\Models\Geofence;
use App\Models\Department;
use App\Models\UserDocument;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Inertia\Inertia;

class AdminDashboardController extends Controller
{
    public function index()
    {
        $today = Carbon::today();

        // --- 1. KPI Cards (Live Data) ---
        $totalEmployees = User::where('role_id', '!=', 1)->count(); // Exclude SuperAdmin
        
        // Fix: Use 'check_in_time' instead of 'check_in'
        $presentToday = Attendance::whereDate('date', $today)
            ->whereNotNull('check_in_time')
            ->distinct('user_id')
            ->count();

        // Late Arrivals (Assuming shift starts at 09:15 AM)
        $lateArrivals = Attendance::whereDate('date', $today)
            ->whereTime('check_in_time', '>', '09:15:00')
            ->count();

        // Geofence Violations (Based on your 'is_inside_fence' boolean)
        $geofenceViolations = Attendance::whereDate('date', $today)
            ->where('is_inside_fence', false)
            ->count();

        // --- 2. Attendance Trend (Last 7 Days) ---
        $attendanceTrend = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $count = Attendance::whereDate('date', $date)->distinct('user_id')->count();
            
            $attendanceTrend[] = [
                'name' => $date->format('D'), // Mon, Tue...
                'present' => $count,
                'absent' => max(0, $totalEmployees - $count), // simple calculation
            ];
        }

        // --- 3. Recent Activity Feed (Using your models) ---
        $recentLogs = Attendance::with(['user.department'])
            ->whereDate('date', $today)
            ->whereNotNull('check_in_time')
            ->latest('check_in_time')
            ->take(6)
            ->get()
            ->map(function ($log) {
                // Determine status logic based on your fields
                $status = 'Present';
                if ($log->is_anomaly) $status = 'Anomaly';
                elseif (!$log->is_inside_fence) $status = 'Geofence Breach';
                elseif (Carbon::parse($log->check_in_time)->gt(Carbon::parse('09:15:00'))) $status = 'Late';

                return [
                    'id' => $log->id,
                    'user_name' => $log->user->name ?? 'Unknown',
                    // Use a placeholder or actual profile photo path
                    'avatar' => $log->user->profile_photo_url ?? null, 
                    'department' => $log->user->department->name ?? 'General',
                    'status' => $status,
                    'time' => Carbon::parse($log->check_in_time)->format('h:i A'),
                    'is_inside_fence' => $log->is_inside_fence,
                    'distance' => round($log->distance_from_fence_m, 2),
                ];
            });

        // --- 4. Live Geofences (Map Data) ---
        $activeGeofences = Geofence::select('id', 'name', 'coordinates', 'radius', 'shape_type')
            ->take(10)
            ->get();

        // --- 5. Pending Documents (Quick Action) ---
        $pendingDocs = UserDocument::where('verification_status', 'pending')->count();

        return Inertia::render('SuperAdmin/AdminDashboard', [
            'stats' => [
                'total_employees' => $totalEmployees,
                'present_today' => $presentToday,
                'late_arrivals' => $lateArrivals,
                'geofence_violations' => $geofenceViolations,
                'pending_docs' => $pendingDocs,
            ],
            'chartData' => $attendanceTrend,
            'recentLogs' => $recentLogs,
            'geofences' => $activeGeofences,
        ]);
    }
}