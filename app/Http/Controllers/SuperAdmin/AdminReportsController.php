<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
// use Spatie\Activitylog\Models\Activity; // Uncomment if using Spatie

class AdminReportsController extends Controller
{
    public function index()
    {
        // 1. Fetch Real System Logs
        try {
            $realLogs = Alert::with('causer')
                ->latest()
                ->take(10)
                ->get()
                ->toBase() // <--- FIX: Converts Eloquent Collection to Standard Collection
                ->map(function ($log) {
                    return [
                        'id' => $log->id,
                        'action' => $log->description,
                        'user' => $log->causer ? $log->causer->name : 'System',
                        'ip' => $log->properties['ip'] ?? '127.0.0.1',
                        'time' => $log->created_at->diffForHumans(),
                        'status' => $log->properties['status'] ?? 'Success',
                    ];
                });
        } catch (\Exception $e) {
            $realLogs = collect([]);
        }

        // 2. Mock Logs (Dummy Data)
        $dummyLogs = collect([
            [
                'id' => 999,
                'action' => 'User Login',
                'user' => 'Rajesh Kumar',
                'ip' => '192.168.1.45',
                'time' => '2 mins ago',
                'status' => 'Success'
            ],
            [
                'id' => 998,
                'action' => 'Geofence Created: Khurda Zone A',
                'user' => 'District Admin',
                'ip' => '10.0.0.12',
                'time' => '15 mins ago',
                'status' => 'Success'
            ],
            [
                'id' => 997,
                'action' => 'Failed Login Attempt',
                'user' => 'Unknown',
                'ip' => '45.22.12.11',
                'time' => '1 hour ago',
                'status' => 'Warning'
            ],
            [
                'id' => 996,
                'action' => 'Report Generated: Monthly Attendance',
                'user' => 'Rajesh Kumar',
                'ip' => '192.168.1.10',
                'time' => '3 hours ago',
                'status' => 'Success'
            ],
            [
                'id' => 995,
                'action' => 'API Key Revoked',
                'user' => 'System',
                'ip' => '127.0.0.1',
                'time' => '5 hours ago',
                'status' => 'Error'
            ],
            [
                'id' => 994,
                'action' => 'Department Updated: Finance',
                'user' => 'Super Admin',
                'ip' => '192.168.1.50',
                'time' => '1 day ago',
                'status' => 'Success'
            ],
        ]);

        // Merge: Since we used toBase(), both are now standard collections and can merge arrays safely.
        $logs = $realLogs->merge($dummyLogs);

        // 3. Mock Reports Data
        $reports = [
            [
                'id' => 'RPT-001',
                'name' => 'Monthly Attendance Summary - Khurda',
                'type' => 'Attendance',
                'format' => 'PDF',
                'size' => '2.4 MB',
                'generated_by' => ['name' => 'Rajesh Kumar', 'avatar' => 'RK'],
                'date' => Carbon::yesterday()->format('Y-m-d h:i A'),
                'status' => 'Ready'
            ],
            [
                'id' => 'RPT-002', 
                'name' => 'Geofence Violation Report',
                'type' => 'Security',
                'format' => 'Excel',
                'size' => '856 KB',
                'generated_by' => ['name' => 'System Admin', 'avatar' => 'SA'],
                'date' => Carbon::now()->subHours(4)->format('Y-m-d h:i A'),
                'status' => 'Ready'
            ],
             [
                'id' => 'RPT-003',
                'name' => 'Payroll Export (Nov 2025)',
                'type' => 'Payroll',
                'format' => 'CSV',
                'size' => '--',
                'generated_by' => ['name' => 'Finance Dept', 'avatar' => 'FD'],
                'date' => Carbon::now()->format('Y-m-d h:i A'),
                'status' => 'Processing'
            ],
            [
                'id' => 'RPT-004',
                'name' => 'Device Health Log',
                'type' => 'System',
                'format' => 'JSON',
                'size' => '12 KB',
                'generated_by' => ['name' => 'System', 'avatar' => 'SY'],
                'date' => Carbon::now()->subDays(2)->format('Y-m-d h:i A'),
                'status' => 'Failed'
            ]
        ];

        // 4. Mock Chart Data
        $chartData = [
            ['name' => 'Mon', 'generated' => 45, 'downloads' => 30],
            ['name' => 'Tue', 'generated' => 52, 'downloads' => 38],
            ['name' => 'Wed', 'generated' => 38, 'downloads' => 45],
            ['name' => 'Thu', 'generated' => 65, 'downloads' => 50],
            ['name' => 'Fri', 'generated' => 48, 'downloads' => 40],
            ['name' => 'Sat', 'generated' => 25, 'downloads' => 15],
            ['name' => 'Sun', 'generated' => 15, 'downloads' => 8],
        ];

        // 5. Mock Stats
        $stats = [
            'total_generated' => 1284,
            'processing' => 3,
            'failed' => 12
        ];

        return Inertia::render('SuperAdmin/Reports/Index', [
            'reports' => $reports,
            'logs' => $logs,
            'chartData' => $chartData,
            'stats' => $stats
        ]);
    }

    // Add this method inside AdminReportsController class

public function download($id)
{
    // In a real app, fetch the report path from DB:
    // $report = Report::findOrFail($id);
    // return Storage::download($report->path, $report->name);

    // For Demo: Generate a dummy content file
    $content = "Report ID: $id\nGenerated on: " . now()->toDateTimeString() . "\nStatus: Success\n\nThis is a sample report file.";
    
    $fileName = "report_{$id}.txt";

    return response()->streamDownload(function () use ($content) {
        echo $content;
    }, $fileName, [
        'Content-Type' => 'text/plain',
    ]);
}
}