<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use  HasApiTokens,HasFactory, Notifiable, TwoFactorAuthenticatable,SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
       'name', 'email', 'phone', 'password',
        'role_id', 'department_id', 'status', 'is_first_login',
        'address', 'district', 'block', 'gram_panchayat', 'pincode'
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];


    protected $with = ['role'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    // Relationships
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function settings(): HasOne
    {
        return $this->hasOne(UserSetting::class)->withDefault();
    }

    // Helper to check roles easily
    public function hasRole(string $slug): bool
    {
        return $this->role?->slug === $slug;
    }

    public function geofences()
    {
        return $this->belongsToMany(Geofence::class, 'user_geofence');
    }

    public function documents()
    {
        return $this->hasMany(UserDocument::class);
    }

public function faceEmbedding()
{
    // This correctly grabs the row with the highest ID (newest) efficiently
    return $this->hasOne(UserFaceEmbedding::class)->latestOfMany();
}

// efficiently fetch the latest location
public function latestLocation()
{
    return $this->hasOne(EmployeeLocation::class)->latestOfMany();
}


}
