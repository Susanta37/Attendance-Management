<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserSetting extends Model
{
    protected $table = 'user_settings';

    protected $fillable = [
        'user_id',
        'face_verification_enabled',
        'gps_spoof_check_enabled',
        'multiple_attendance_allowed',
        'allow_outside_geofence',
        'live_tracking_enabled',
        'shift_start',
        'shift_end',
    ];

    /**
     * Relation: Settings belong to a User.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Helper: Is face verification required?
     */
    public function requiresFaceVerification(): bool
    {
        return $this->face_verification_enabled === true;
    }

    /**
     * Helper: Is live tracking allowed?
     */
    public function isLiveTrackingEnabled(): bool
    {
        return $this->live_tracking_enabled === true;
    }
}
