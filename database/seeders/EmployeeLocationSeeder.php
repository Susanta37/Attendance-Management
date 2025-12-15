<?php

namespace Database\Seeders;

use App\Models\EmployeeLocation;
use App\Models\User;
use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class EmployeeLocationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * This seeder creates sample GPS tracking data for testing the live location feature
     */
    public function run(): void
    {
        // Find any recent attendance record with check-in
        $attendance = Attendance::whereNotNull('check_in_time')
            ->whereNotNull('check_in_lat')
            ->whereNotNull('check_in_lng')
            ->orderBy('date', 'desc')
            ->first();

        if (!$attendance) {
            $this->command->warn('No attendance records with location found. Please create an attendance record first.');
            return;
        }

        // Delete existing location data for this attendance to avoid duplicates
        EmployeeLocation::where('attendance_id', $attendance->id)->delete();

        $user = $attendance->user;
        
        // Use the actual check-in location from attendance
        $startLat = $attendance->check_in_lat;
        $startLng = $attendance->check_in_lng;
        
        // Determine end location (use check-out if exists, otherwise simulate movement)
        $endLat = $attendance->check_out_lat ?? ($startLat + 0.015);
        $endLng = $attendance->check_out_lng ?? ($startLng + 0.012);

        // Create a realistic GPS trail (simulate movement over time)
        $locations = [];
        $numberOfPoints = 25; // Number of location pings

        // Parse the date from the attendance record (extract just the date part)
        $attendanceDate = Carbon::parse($attendance->date)->startOfDay();
        
        // Create realistic times within the same day as the attendance
        $checkInTime = $attendanceDate->copy()->setTimeFromTimeString('09:00:00'); // 9 AM on attendance date
        $checkOutTime = $attendanceDate->copy()->setTimeFromTimeString('17:00:00'); // 5 PM on attendance date

        // Calculate time interval between points
        $totalMinutes = $checkInTime->diffInMinutes($checkOutTime);
        $intervalMinutes = max(1, floor($totalMinutes / $numberOfPoints));

        for ($i = 0; $i < $numberOfPoints; $i++) {
            // Calculate progress (0 to 1)
            $progress = $i / ($numberOfPoints - 1);
            
            // Interpolate between start and end with some random variation
            $lat = $startLat + (($endLat - $startLat) * $progress) + (rand(-5, 5) / 10000);
            $lng = $startLng + (($endLng - $startLng) * $progress) + (rand(-5, 5) / 10000);

            $locations[] = [
                'user_id' => $user->id,
                'attendance_id' => $attendance->id,
                'lat' => $lat,
                'lng' => $lng,
                'speed' => rand(0, 60), // Random speed in km/h
                'accuracy' => rand(5, 20), // Random accuracy in meters
                'battery' => max(100 - ($i * 3), 20), // Decreasing battery
                'recorded_at' => $checkInTime->copy()->addMinutes($i * $intervalMinutes),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // Insert all locations
        EmployeeLocation::insert($locations);

        $this->command->info("✓ Created {$numberOfPoints} location points for user: {$user->name}");
        $this->command->info("  Attendance ID: {$attendance->id}");
        $this->command->info("  Attendance Date: {$attendanceDate->format('Y-m-d')}");
        $this->command->info("  Location Time Range: {$checkInTime->format('Y-m-d H:i')} - {$checkOutTime->format('Y-m-d H:i')}");
        $this->command->line('');
        $this->command->info('✓ You can now view the live location in the attendance modal!');
    }
}
