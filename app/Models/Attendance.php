<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Attendance extends Model
{
    use SoftDeletes;

    protected $table = 'attendances';

    protected $fillable = [
        'user_id',
        'date',
        'check_in_time',
        'check_out_time',
        'check_in_image',
        'check_out_image',
        'check_in_lat',
        'check_in_lng',
        'check_out_lat',
        'check_out_lng',
        'is_face_matched',
        'notes',

        // New geofence fields
        'distance_from_fence_m',
        'is_inside_fence',
        'is_anomaly',
        'device_id',
    ];

    protected $casts = [
        'date' => 'date',
        'check_in_time' => 'datetime:H:i',
        'check_out_time' => 'datetime:H:i',
        'check_in_lat' => 'float',
        'check_in_lng' => 'float',
        'check_out_lat' => 'float',
        'check_out_lng' => 'float',
        'is_face_matched' => 'boolean',

        // Casting new fields
        'distance_from_fence_m' => 'float',
        'is_inside_fence' => 'boolean',
        'is_anomaly' => 'boolean',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    // Attendance belongs to a user
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // If tracking movement per attendance session
    public function locations()
    {
        return $this->hasMany(EmployeeLocation::class);
    }
}
