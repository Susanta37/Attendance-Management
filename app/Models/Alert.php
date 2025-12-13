<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Alert extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'attendance_id',
        'type',
        'title',
        'message',
        'resolved_by',
        'resolved_at',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    /**
     * User who triggered the alert
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The attendance record related to this alert
     */
    public function attendance()
    {
        return $this->belongsTo(Attendance::class);
    }

    /**
     * The admin/supervisor who resolved the alert
     */
    public function resolver()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
