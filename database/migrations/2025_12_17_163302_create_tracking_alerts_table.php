<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tracking_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // The employee
            $table->foreignId('geofence_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('attendance_id')->nullable()->constrained()->onDelete('cascade');

            $table->string('type')->default('geofence_breach'); // geofence_breach, gps_off, etc.
            $table->string('title');
            $table->text('message');
            $table->decimal('lat', 10, 8)->nullable();
            $table->decimal('lng', 11, 8)->nullable();

            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            // Prevent spamming the same alert every minute
            // We can use a unique index on user_id + date + hour, or handle in logic
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tracking_alerts');
    }
};
