<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Block extends Model
{
    protected $table = 'block_mst';
    protected $primaryKey = 'pk_block_id';
    protected $fillable = ['block_name', 'block_code', 'fk_district_id', 'is_active'];
}