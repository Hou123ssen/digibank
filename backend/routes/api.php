<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\EmployeeController;
use App\Http\Controllers\Api\Admin\KycReviewController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CagnotteController;
use App\Http\Controllers\Api\DaretController;
use App\Http\Controllers\Api\KycController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\TrustScoreController;
use App\Http\Controllers\Api\Employee\TicketController as EmployeeTicketController;
use App\Http\Controllers\Api\Employee\DashboardController as EmployeeDashboardController;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureEmployeeDepartment;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/accounts/me', [AccountController::class, 'me']);
    Route::post('/accounts/deposit', [AccountController::class, 'deposit']);
    Route::post('/accounts/withdraw', [AccountController::class, 'withdraw']);
    Route::post('/accounts/transfer', [AccountController::class, 'transfer']);
    Route::get('/transactions/me', [TransactionController::class, 'me']);
    Route::get('/trust-score/me', [TrustScoreController::class, 'me']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);

    Route::post('/tickets', [TicketController::class, 'store']);
    Route::get('/tickets/my', [TicketController::class, 'my']);
    Route::post('/tickets/{ticket}/message', [TicketController::class, 'message']);

    Route::post('/kyc/submit', [KycController::class, 'submit']);
    Route::get('/kyc/me', [KycController::class, 'me']);

    Route::get('/darets', [DaretController::class, 'index']);
    Route::get('/darets/my', [DaretController::class, 'my']);
    Route::get('/darets/{daret}', [DaretController::class, 'show']);
    Route::post('/darets', [DaretController::class, 'store']);
    Route::post('/darets/{daret}/join', [DaretController::class, 'join']);
    Route::post('/darets/{daret}/start', [DaretController::class, 'start']);
    Route::post('/darets/{daret}/pay', [DaretController::class, 'pay']);

    Route::get('/cagnottes', [CagnotteController::class, 'index']);
    Route::post('/cagnottes/request', [CagnotteController::class, 'store']);
    Route::get('/cagnottes/my-requests', [CagnotteController::class, 'myRequests']);
    Route::post('/cagnottes/{cagnotte}/donate', [CagnotteController::class, 'donate']);

    Route::middleware(EnsureEmployeeDepartment::class . ':cagnotte')->prefix('employee/cagnottes')->group(function (): void {
        Route::get('/pending', [CagnotteController::class, 'pending']);
        Route::get('/code/{verificationCode}', [CagnotteController::class, 'showByCode']);
        Route::post('/{cagnotte}/approve', [CagnotteController::class, 'approve']);
        Route::post('/{cagnotte}/reject', [CagnotteController::class, 'reject']);
    });

    Route::middleware(EnsureEmployeeDepartment::class)->prefix('employee')->group(function (): void {
        Route::get('/stats', [EmployeeDashboardController::class, 'stats']);
        Route::get('/performance', [EmployeeDashboardController::class, 'performance']);
        Route::get('/activity', [EmployeeDashboardController::class, 'activity']);
    });

    Route::middleware(EnsureEmployeeDepartment::class . ':tickets')->prefix('employee/tickets')->group(function (): void {
        Route::get('/', [EmployeeTicketController::class, 'index']);
        Route::post('/{ticket}/assign', [EmployeeTicketController::class, 'assign']);
        Route::post('/{ticket}/reply', [EmployeeTicketController::class, 'reply']);
        Route::post('/{ticket}/resolve', [EmployeeTicketController::class, 'resolve']);
        Route::post('/{ticket}/close', [EmployeeTicketController::class, 'close']);
    });

    Route::middleware(EnsureEmployeeDepartment::class . ':kyc')->prefix('employee/kyc')->group(function (): void {
        Route::get('/{kyc}/pdf', [KycReviewController::class, 'pdf']);
    });

    Route::middleware(EnsureAdmin::class)->prefix('admin/employees')->group(function (): void {
        Route::get('/', [EmployeeController::class, 'index']);
        Route::post('/', [EmployeeController::class, 'store']);
        Route::patch('/{employee}', [EmployeeController::class, 'update']);
        Route::delete('/{employee}', [EmployeeController::class, 'destroy']);
    });

    Route::get('/admin/dashboard/stats', [DashboardController::class, 'stats'])
        ->middleware(EnsureAdmin::class);

    Route::get('/admin/users', [AdminUserController::class, 'index'])
        ->middleware(EnsureAdmin::class);

    Route::middleware(EnsureEmployeeDepartment::class . ':kyc')->prefix('admin/kyc')->group(function (): void {
        Route::get('/pending', [KycReviewController::class, 'pending']);
        Route::post('/{kyc}/approve', [KycReviewController::class, 'approve']);
        Route::post('/{kyc}/reject', [KycReviewController::class, 'reject']);
    });
});
