<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('employee_locations', function (Blueprint $table) {

            // 📍 Location name (Office, Site A, Client Location, etc.)
            $table->string('name')
                  ->nullable()
                  ->after('attendance_id');

            // ⏱ Time spent at this location (in seconds)
            $table->unsignedInteger('time_spent_seconds')
                  ->nullable()
                  ->after('recorded_at')
                  ->comment('Time spent at this location in seconds');

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_locations', function (Blueprint $table) {
            $table->dropColumn([
                'name',
                'time_spent_seconds'
            ]);
        });
    }
};
