<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEmployeeRequest;
use App\Models\User;
use App\Support\ApiResponse;

class EmployeeController extends Controller
{
    public function store(StoreEmployeeRequest $request)
    {
        $employee = User::create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password' => $request->validated('password'),
            'role' => User::ROLE_EMPLOYEE,
        ]);

        return ApiResponse::success('Employee account created', [
            'employee' => $employee,
        ], 201);
    }
}
