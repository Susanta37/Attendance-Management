<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeLocation extends Model
{
    protected $fillable = [
        'user_id',
        'attendance_id',
        'name',                 // 📍 location name
        'lat',
        'lng',
        'speed',
        'accuracy',
        'battery',
        'recorded_at',
        'time_spent_seconds',   // ⏱ time spent
    ];

    protected $casts = [
        'lat'                => 'float',
        'lng'                => 'float',
        'speed'              => 'float',
        'accuracy'           => 'float',
        'battery'            => 'integer',
        'recorded_at'        => 'datetime',
        'time_spent_seconds' => 'integer',
    ];

    /**
     * User who owns this location record
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Attendance session this location belongs to
     */
    public function attendance()
    {
        return $this->belongsTo(Attendance::class);
    }
}
