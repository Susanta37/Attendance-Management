<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateEmployeeLocationsTable extends Migration
{
    public function up()
    {
        Schema::create('employee_locations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            // Optional: link to a check-in session
            $table->foreignId('attendance_id')
                  ->nullable()
                  ->constrained('attendances')
                  ->nullOnDelete();

            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);

            // Optional tracking info
            $table->decimal('speed', 8, 2)->nullable();
            $table->decimal('accuracy', 8, 2)->nullable();
            $table->integer('battery')->nullable();

            $table->timestamp('recorded_at'); // actual device time
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('employee_locations');
    }
}
