<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DepositRequest;
use App\Http\Requests\TransferRequest;
use App\Http\Requests\WithdrawRequest;
use App\Models\Transaction;
use App\Services\AccountService;
use App\Support\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    public function __construct(private readonly AccountService $accountService) {}

    public function me(Request $request)
    {
        return ApiResponse::success('Account details retrieved.', [
            'account' => $request->user()->account,
            'balance' => $this->accountService->getBalance($request->user()),
        ]);
    }

    public function summary(Request $request)
    {
        return ApiResponse::success('Account summary retrieved.', $this->monthlySummary($request));
    }

    public function statementPdf(Request $request)
    {
        $user = $request->user();
        $account = $user->account()->firstOrFail();
        $periodStart = now()->startOfMonth();
        $periodEnd = now();
        $summary = $this->monthlySummary($request);

        $transactions = $account->transactions()
            ->where('status', Transaction::STATUS_SUCCESS)
            ->whereBetween('created_at', [$periodStart, $periodEnd])
            ->with(['relatedAccount:id,account_number'])
            ->oldest()
            ->get();

        $pdf = Pdf::loadView('pdf.account-statement', [
            'user' => $user,
            'account' => $account,
            'transactions' => $transactions,
            'summary' => $summary,
            'periodStart' => $periodStart,
            'periodEnd' => $periodEnd,
            'generatedAt' => now(),
        ])
            ->setPaper('a4')
            ->setOptions([
                'defaultFont' => 'DejaVu Sans',
                'isHtml5ParserEnabled' => true,
                'isFontSubsettingEnabled' => true,
            ]);

        return $pdf->download('releve-digibank.pdf');
    }

    public function deposit(DepositRequest $request)
    {
        $result = $this->accountService->deposit(
            $request->user(),
            (float) $request->validated('amount')
        );

        return ApiResponse::success('Deposit completed successfully.', [
            'account' => $result['account'],
            'transaction' => $result['transaction'],
            'new_balance' => $result['new_balance'],
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

    private function monthlySummary(Request $request): array
    {
        $account = $request->user()->account()->firstOrFail();
        $periodStart = now()->startOfMonth();
        $periodEnd = now();

        $totals = $account->transactions()
            ->where('status', Transaction::STATUS_SUCCESS)
            ->whereBetween('created_at', [$periodStart, $periodEnd])
            ->selectRaw("
                COALESCE(SUM(CASE WHEN type IN (?, ?) THEN amount ELSE 0 END), 0) as monthly_inflows,
                COALESCE(SUM(CASE WHEN type IN (?, ?) THEN amount ELSE 0 END), 0) as monthly_outflows
            ", [
                Transaction::TYPE_DEPOSIT,
                Transaction::TYPE_TRANSFER_IN,
                Transaction::TYPE_WITHDRAW,
                Transaction::TYPE_TRANSFER_OUT,
            ])
            ->first();

        $monthlyInflows = round((float) $totals->monthly_inflows, 2);
        $monthlyOutflows = round((float) $totals->monthly_outflows, 2);

        return [
            'monthly_inflows' => $monthlyInflows,
            'monthly_outflows' => $monthlyOutflows,
            'net_flow' => round($monthlyInflows - $monthlyOutflows, 2),
        ];
    }
}
