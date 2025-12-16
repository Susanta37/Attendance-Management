<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Gp extends Model
{
    protected $table = 'gp_mst';
    protected $primaryKey = 'pk_gp_id';
    protected $fillable = ['gp_name', 'gp_code', 'fk_block_id', 'is_active'];
}