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
        Schema::create('roles', function (Blueprint $table) {
        $table->id();
        $table->string('name'); // e.g., District Collector
        $table->string('slug')->unique(); // e.g., collector
        $table->timestamps();
    });

    Schema::create('permissions', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('slug')->unique();
        $table->timestamps();
    });

    // Pivot table for Role <-> Permission
    Schema::create('permission_role', function (Blueprint $table) {
        $table->foreignId('role_id')->constrained()->cascadeOnDelete();
        $table->foreignId('permission_id')->constrained()->cascadeOnDelete();
        $table->primary(['role_id', 'permission_id']);
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('roles_and_permissions_tables');
    }
};
