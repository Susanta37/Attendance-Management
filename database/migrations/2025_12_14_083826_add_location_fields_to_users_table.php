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
            $table->text('address')->nullable()->after('phone');
            $table->string('district')->nullable()->after('address');
            $table->string('block')->nullable()->after('district');
            $table->string('gram_panchayat')->nullable()->after('block');
            $table->string('pincode', 6)->nullable()->after('gram_panchayat');
            
            $table->index(['district', 'block']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['address', 'district', 'block', 'gram_panchayat', 'pincode']);
        });
    }
};
