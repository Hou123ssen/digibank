<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEmployeeRequest;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    public function index()
    {
        $employees = User::query()
            ->where('role', User::ROLE_EMPLOYEE)
            ->latest()
            ->get()
            ->map(fn (User $employee): array => $this->formatEmployee($employee))
            ->values();

        return ApiResponse::success('Employees retrieved successfully.', $employees);
    }

    public function store(StoreEmployeeRequest $request)
    {
        $employee = User::create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'phone' => $request->validated('phone'),
            'password' => Hash::make($request->validated('password')),
            'role' => User::ROLE_EMPLOYEE,
            'department' => $request->validated('department'),
            'status' => $request->validated('status', 'active'),
        ]);

        return ApiResponse::success('Employee account created', $this->formatEmployee($employee), 201);
    }

    public function update(Request $request, User $employee)
    {
        if ($employee->role !== User::ROLE_EMPLOYEE) {
            return ApiResponse::error('Employee not found.', [], 404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($employee->id)],
            'phone' => ['nullable', 'string', 'max:50'],
            'password' => ['nullable', 'string', 'min:8'],
            'department' => ['sometimes', 'required', Rule::in(['kyc', 'tickets', 'cagnotte', 'audit', 'support'])],
            'status' => ['sometimes', 'required', Rule::in(['active', 'inactive'])],
        ]);

        if (array_key_exists('password', $validated) && $validated['password']) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $employee->update($validated);

        return ApiResponse::success('Employee updated successfully.', $this->formatEmployee($employee->fresh()));
    }

    public function destroy(User $employee)
    {
        if ($employee->role !== User::ROLE_EMPLOYEE) {
            return ApiResponse::error('Employee not found.', [], 404);
        }

        $employee->update(['status' => 'inactive']);

        return ApiResponse::success('Employee deactivated successfully.', $this->formatEmployee($employee->fresh()));
    }

    private function formatEmployee(User $employee): array
    {
        return [
            'id' => $employee->id,
            'name' => $employee->name,
            'email' => $employee->email,
            'phone' => $employee->phone,
            'role' => $employee->role,
            'department' => $employee->department,
            'status' => $employee->status ?? 'active',
            'performance' => 0,
            'created_at' => $employee->created_at,
            'updated_at' => $employee->updated_at,
        ];
    }
}
