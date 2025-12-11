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
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone')->nullable()->unique()->after('email');
            $table->foreignId('role_id')->nullable()->constrained()->nullOnDelete()->after('password');
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete()->after('role_id');
            $table->enum('status', ['active', 'inactive', 'suspended'])->default('active')->index();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
          $table->string('phone')->nullable()->unique()->after('email');
            
            // Constrained assumes tables 'roles' and 'departments' exist
            $table->foreignId('role_id')
                  ->nullable()
                  ->after('password')
                  ->constrained('roles')
                  ->nullOnDelete();

            $table->foreignId('department_id')
                  ->nullable()
                  ->after('role_id')
                  ->constrained('departments')
                  ->nullOnDelete();

            $table->enum('status', ['active', 'inactive', 'suspended'])
                  ->default('active')
                  ->index()
                  ->after('department_id');

            $table->softDeletes();
        });
    }
};
