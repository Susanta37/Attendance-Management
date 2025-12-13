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
        Schema::create('user_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Security Settings
            $table->boolean('face_verification_enabled')->default(false);
            $table->boolean('gps_spoof_check_enabled')->default(true);
            $table->boolean('multiple_attendance_allowed')->default(false);
            $table->boolean('allow_outside_geofence')->default(false);
            $table->boolean('live_tracking_enabled')->default(false);

            // Shift Logic
            $table->time('shift_start')->nullable();
            $table->time('shift_end')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_settings');
    }
};
