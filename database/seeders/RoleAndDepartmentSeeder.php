<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RoleAndDepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
       $roles = [
            'collector' => 'District Collector (Super Admin)',
            'district_admin' => 'District Admin',
            'block_admin' => 'Block Admin',
            'department_manager' => 'Department Manager',
            'employee' => 'Employee',
        ];

        foreach ($roles as $slug => $name) {
            Role::firstOrCreate(['slug' => $slug], ['name' => $name]);
        }

        // 2. Create Top Level Department (The State or HQ)
        $hq = Department::firstOrCreate([
            'name' => 'State Headquarters',
            'type' => 'state',
            'parent_id' => null,
        ]);

        // 3. Create the Super Admin User (Collector)
        $collectorRole = Role::where('slug', 'collector')->first();

        $admin = User::firstOrCreate(
            ['email' => 'admin@government.gov'], 
            [
                'name' => 'Super Collector',
                'phone' => '9999999999',
                'password' => Hash::make('password'), 
                'role_id' => $collectorRole->id,
                'department_id' => $hq->id,
                'status' => 'active',
            ]
        );
        
        // Initialize Admin Settings
        $admin->settings()->create([
             'gps_spoof_check_enabled' => false, 
             'multiple_attendance_allowed' => true,
        ]);
    }
}
