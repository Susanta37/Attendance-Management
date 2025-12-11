<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    protected $fillable = ['name', 'slug'];

    // The inverse relationship
    public function roles()
    {
        return $this->belongsToMany(Role::class, 'permission_role');
    }
}