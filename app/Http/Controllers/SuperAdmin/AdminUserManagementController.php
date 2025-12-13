<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AdminUserManagementController extends Controller
{
    public function index()
    {
        return inertia('SuperAdmin/UserManagement/Index');
    }
}
