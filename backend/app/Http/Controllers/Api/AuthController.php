<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Services\AuthService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $authService)
    {
    }

    public function register(RegisterRequest $request)
    {
        return ApiResponse::success(
            'User registered successfully.',
            $this->authService->register($request->validated()),
            201
        );
    }

    public function login(LoginRequest $request)
    {
        return ApiResponse::success(
            'Logged in successfully.',
            $this->authService->login($request->validated())
        );
    }

    public function logout(Request $request)
    {
        $this->authService->logout($request->user());

        return ApiResponse::success('Logged out successfully.');
    }

    public function me(Request $request)
    {
        return ApiResponse::success('Authenticated user profile.', [
            'user' => $request->user()->load('account'),
        ]);
    }

    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'password' => ['nullable', 'confirmed', Password::min(8)],
        ]);

        $user = $request->user();
        $user->name = $data['name'];
        $user->phone = $data['phone'] ?? null;

        if (!empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }

        $user->save();

        return ApiResponse::success('Profile updated successfully.', [
            'user' => $user->fresh()->load('account'),
        ]);
    }
}
