<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TrackingAlert extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'geofence_id',
        'attendance_id',
        'type',
        'title',
        'message',
        'lat',
        'lng',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
        'lat' => 'float',
        'lng' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
