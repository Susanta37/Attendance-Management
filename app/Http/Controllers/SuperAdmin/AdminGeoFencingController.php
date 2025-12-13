<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AdminGeoFencingController extends Controller
{
    public function index()
    {
        return inertia('SuperAdmin/GeoFencing/Index');
    }
}
