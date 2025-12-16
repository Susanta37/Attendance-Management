<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class District extends Model
{
    protected $table = 'district_mst';
    protected $primaryKey = 'pk_district_id';
    protected $fillable = ['district_name', 'district_code', 'fk_state_id', 'is_active'];
}