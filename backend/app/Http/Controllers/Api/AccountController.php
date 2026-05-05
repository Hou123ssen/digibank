<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DepositRequest;
use App\Http\Requests\TransferRequest;
use App\Http\Requests\WithdrawRequest;
use App\Services\AccountService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    public function __construct(private readonly AccountService $accountService)
    {
    }

    public function me(Request $request)
    {
        return ApiResponse::success('Account details retrieved.', [
            'account' => $request->user()->account,
            'balance' => $this->accountService->getBalance($request->user()),
        ]);
    }

    public function deposit(DepositRequest $request)
    {
        $account = $this->accountService->deposit(
            $request->user(),
            (float) $request->validated('amount')
        );

        return ApiResponse::success('Deposit completed successfully.', [
            'account' => $account,
        ]);
    }

    public function withdraw(WithdrawRequest $request)
    {
        $account = $this->accountService->withdraw(
            $request->user(),
            (float) $request->validated('amount')
        );

        return ApiResponse::success('Withdrawal completed successfully.', [
            'account' => $account,
        ]);
    }

    public function transfer(TransferRequest $request)
    {
        $result = $this->accountService->transfer(
            $request->user(),
            $request->validated('account_number'),
            (float) $request->validated('amount')
        );

        return ApiResponse::success('Transfer completed successfully.', $result);
    }
}
