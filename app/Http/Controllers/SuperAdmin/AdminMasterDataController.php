<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AdminMasterDataController extends Controller
{
    public function index()
    {
        return inertia('SuperAdmin/MasterData/Index');
    }
}
