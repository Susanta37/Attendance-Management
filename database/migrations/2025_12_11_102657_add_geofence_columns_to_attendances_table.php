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
        Schema::table('attendances', function (Blueprint $table) {

            $table->double('distance_from_fence_m')->nullable()->after('check_out_lng');
            $table->boolean('is_inside_fence')->default(false)->after('distance_from_fence_m');
            $table->boolean('is_anomaly')->default(false)->after('is_inside_fence');
            $table->string('device_id')->nullable()->after('is_anomaly');

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropColumn([
                'distance_from_fence_m',
                'is_inside_fence',
                'is_anomaly',
                'device_id',
            ]);
        });
    }
};
