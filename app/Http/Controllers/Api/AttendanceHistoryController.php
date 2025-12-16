<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use Illuminate\Http\Request;

class AttendanceHistoryController extends Controller
{
   public function index(Request $request)
{
    $user   = $request->user();
    $filter = $request->query('filter'); // null = all

    $query = Attendance::where('user_id', $user->id)
        ->orderBy('date', 'desc');

    // Date range variables
    $startDate = null;
    $endDate   = null;

    if ($filter) {
        switch ($filter) {
            case 'today':
                $startDate = now()->toDateString();
                $endDate   = now()->toDateString();
                break;

            case 'this_week':
                $startDate = now()->startOfWeek()->toDateString();
                $endDate   = now()->endOfWeek()->toDateString();
                break;

            case 'this_month':
                $startDate = now()->startOfMonth()->toDateString();
                $endDate   = now()->endOfMonth()->toDateString();
                break;

            case 'custom':
                $request->validate([
                    'from_date' => 'required|date',
                    'to_date'   => 'required|date|after_or_equal:from_date',
                ]);

                $startDate = $request->from_date;
                $endDate   = $request->to_date;
                break;

            default:
                return response()->json([
                    'status'  => false,
                    'message' => 'Invalid filter'
                ], 422);
        }

        $query->whereBetween('date', [$startDate, $endDate]);
    }

    // Attendance records
    $attendances = $query->get();

    /**
     * ✅ PRESENT DAYS (unique dates with attendance)
     */
    $presentDays = $attendances
        ->pluck('date')
        ->unique()
        ->count();

    /**
     * ❌ ABSENT DAYS (only if date range exists)
     */
    $absentDays = null;

    if ($startDate && $endDate) {
        $totalDays = \Carbon\Carbon::parse($startDate)
            ->diffInDays(\Carbon\Carbon::parse($endDate)) + 1;

        $absentDays = max(0, $totalDays - $presentDays);
    }

    // Response mapping
    $data = $attendances->map(function ($a) {
        return [
            'id'                     => $a->id,
            'date'                   => $a->date,
            'check_in_time'          => $a->check_in_time,
            'check_out_time'         => $a->check_out_time,
            'is_inside_fence'        => $a->is_inside_fence,
            'distance_from_fence_m'  => $a->distance_from_fence_m,
            'is_face_matched'        => $a->is_face_matched,
            'is_anomaly'             => $a->is_anomaly,
            'device_id'              => $a->device_id,
        ];
    });

    return response()->json([
        'status' => true,
        'filter' => $filter ?? 'all',
        'summary' => [
            'total_present_days' => $presentDays,
            'total_absent_days'  => $absentDays, // null when filter = all
        ],
        'data' => $data
    ]);
}


}