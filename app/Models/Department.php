<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Department extends Model
{
    use SoftDeletes;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'name',
        'parent_id',
        'type',
    ];

    /**
     * Parent Department (state → district → block → office).
     */
    public function parent()
    {
        return $this->belongsTo(Department::class, 'parent_id');
    }

    /**
     * Child Departments (districts under state, blocks under district, etc.)
     */
    public function children()
    {
        return $this->hasMany(Department::class, 'parent_id');
    }

    /**
     * Employees under this department.
     */
    public function users()
    {
        return $this->hasMany(User::class, 'department_id');
    }

    /**
     * Scope for searching department by name.
     */
    public function scopeSearch($query, $term)
    {
        return $query->when($term, function ($q) use ($term) {
            $q->where('name', 'like', '%' . $term . '%');
        });
    }

    /**
     * Check if department has child departments.
     */
    public function hasChildren()
    {
        return $this->children()->exists();
    }

    /**
     * Full hierarchy path (e.g., "State > District > Block > Office").
     */
    public function getFullPathAttribute()
    {
        $names = [];
        $current = $this;

        while ($current) {
            $names[] = $current->name;
            $current = $current->parent;
        }

        return implode(' > ', array_reverse($names));
    }

    public function geofences()
{
    return $this->belongsToMany(Geofence::class, 'department_geofence');
}

}
