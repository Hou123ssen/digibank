<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\Admin\EmployeeController;
use App\Http\Controllers\Api\Admin\KycReviewController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CagnotteController;
use App\Http\Controllers\Api\DaretController;
use App\Http\Controllers\Api\KycController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\TrustScoreController;
use App\Http\Controllers\Api\Employee\TicketController as EmployeeTicketController;
use App\Http\Middleware\EnsureKycReviewer;
use App\Http\Middleware\EnsureAdmin;
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

    Route::post('/darets', [DaretController::class, 'store']);
    Route::post('/darets/{daret}/join', [DaretController::class, 'join']);
    Route::post('/darets/{daret}/start', [DaretController::class, 'start']);
    Route::post('/darets/{daret}/pay', [DaretController::class, 'pay']);

    Route::get('/cagnottes', [CagnotteController::class, 'index']);
    Route::post('/cagnottes/request', [CagnotteController::class, 'store']);
    Route::get('/cagnottes/my-requests', [CagnotteController::class, 'myRequests']);
    Route::post('/cagnottes/{cagnotte}/donate', [CagnotteController::class, 'donate']);

    Route::middleware(EnsureKycReviewer::class)->prefix('employee/cagnottes')->group(function (): void {
        Route::get('/pending', [CagnotteController::class, 'pending']);
        Route::get('/code/{verificationCode}', [CagnotteController::class, 'showByCode']);
        Route::post('/{cagnotte}/approve', [CagnotteController::class, 'approve']);
        Route::post('/{cagnotte}/reject', [CagnotteController::class, 'reject']);
    });

    Route::middleware(EnsureKycReviewer::class)->prefix('employee/tickets')->group(function (): void {
        Route::get('/', [EmployeeTicketController::class, 'index']);
        Route::post('/{ticket}/assign', [EmployeeTicketController::class, 'assign']);
        Route::post('/{ticket}/reply', [EmployeeTicketController::class, 'reply']);
        Route::post('/{ticket}/resolve', [EmployeeTicketController::class, 'resolve']);
        Route::post('/{ticket}/close', [EmployeeTicketController::class, 'close']);
    });

    Route::post('/admin/create-employee', [EmployeeController::class, 'store'])
        ->middleware(EnsureAdmin::class);

    Route::middleware(EnsureKycReviewer::class)->prefix('admin/kyc')->group(function (): void {
        Route::get('/pending', [KycReviewController::class, 'pending']);
        Route::post('/{kyc}/approve', [KycReviewController::class, 'approve']);
        Route::post('/{kyc}/reject', [KycReviewController::class, 'reject']);
    });
});
