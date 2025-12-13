<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Geofence extends Model
{
    protected $fillable = [
        'name',
        'dist',
        'block',
        'coordinates',
        'shape_type',
        'radius'
    ];

    protected $casts = [
        'coordinates' => 'array'
    ];

    // Many geofences belong to many departments
    public function departments()
    {
        return $this->belongsToMany(Department::class, 'department_geofence');
    }

    // Many geofences belong to many users
    public function users()
    {
        return $this->belongsToMany(User::class, 'user_geofence');
    }
}
