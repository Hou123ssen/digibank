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
use Illuminate\Support\Facades\DB;
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
        try {
            $user    = $request->user();
            $account = $user->account()->firstOrFail();

            $periodStart = now()->startOfMonth();
            $periodEnd   = now();
            $summary     = $this->monthlySummary($request);

            $transactions = $account->transactions()
                ->where('status', Transaction::STATUS_SUCCESS)
                ->whereBetween('created_at', [$periodStart, $periodEnd])
                ->with(['relatedAccount:id,account_number'])
                ->oldest()
                ->get();

            $pdf = Pdf::loadView('pdf.account-statement', [
                'user'         => $user,
                'account'      => $account,
                'transactions' => $transactions,
                'summary'      => $summary,
                'periodStart'  => $periodStart,
                'periodEnd'    => $periodEnd,
                'generatedAt'  => now(),
            ])
                ->setPaper('a4')
                ->setOptions([
                    'defaultFont'           => 'DejaVu Sans',
                    'isHtml5ParserEnabled'  => true,
                    'isFontSubsettingEnabled' => true,
                ]);

            return $pdf->download('releve-digibank.pdf');

        } catch (\Throwable $e) {
            \Log::error('Statement PDF failed', ['error' => $e->getMessage(), 'userId' => $request->user()?->id]);

            return response()->json([
                'success' => false,
                'message' => 'Impossible de générer le relevé PDF. Veuillez réessayer.',
            ], 500);
        }
    }

    public function deposit(DepositRequest $request)
    {
        return ApiResponse::error(
            'Direct deposits are disabled. Please create a secure payment intent.',
            ['deposit' => ['Use POST /api/deposits/create-payment-intent.']],
            410
        );
    }

    public function withdraw(WithdrawRequest $request)
    {
        $result = $this->accountService->withdraw(
            $request->user(),
            (float) $request->validated('amount'),
            $this->idempotencyKey($request)
        );

        return ApiResponse::success('Withdrawal completed successfully.', [
            'account' => $result['account'],
            'transaction' => $result['transaction'],
            'new_balance' => $result['new_balance'],
            'idempotent' => $result['idempotent'] ?? false,
        ]);
    }

    public function transfer(TransferRequest $request)
    {
        $result = $this->accountService->transfer(
            $request->user(),
            $request->validated('account_number'),
            (float) $request->validated('amount'),
            $this->idempotencyKey($request)
        );

        return ApiResponse::success('Transfer completed successfully.', $result);
    }

    public function recentTransferRecipients(Request $request)
    {
        $account = $request->user()->account()->firstOrFail();

        $recipients = Transaction::query()
            ->select([
                'related_account_id',
                DB::raw('COUNT(*) as total_transfers_count'),
                DB::raw('MAX(created_at) as last_transfer_at'),
            ])
            ->where('account_id', $account->id)
            ->where('type', Transaction::TYPE_TRANSFER_OUT)
            ->where('status', Transaction::STATUS_SUCCESS)
            ->whereNotNull('related_account_id')
            ->groupBy('related_account_id')
            ->orderByDesc('last_transfer_at')
            ->limit(10)
            ->with(['relatedAccount.user:id,name,email'])
            ->get()
            ->map(function (Transaction $transaction): array {
                $relatedAccount = $transaction->relatedAccount;
                $recipientName = $relatedAccount?->user?->name ?: 'Compte DigiBank';

                return [
                    'recipient_name' => $recipientName,
                    'account_number' => $relatedAccount?->account_number,
                    'avatar_initials' => $this->initials($recipientName),
                    'total_transfers_count' => (int) $transaction->total_transfers_count,
                    'last_transfer_at' => $transaction->last_transfer_at,
                ];
            })
            ->filter(fn (array $recipient): bool => ! empty($recipient['account_number']))
            ->values();

        return ApiResponse::success('Recent transfer recipients retrieved.', [
            'recipients' => $recipients,
        ]);
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
                COALESCE(SUM(CASE WHEN type IN (?, ?, ?) THEN ABS(amount) ELSE 0 END), 0) as monthly_inflows,
                COALESCE(SUM(CASE WHEN type IN (?, ?, ?, ?) THEN ABS(amount) ELSE 0 END), 0) as monthly_outflows
            ", [
                Transaction::TYPE_DEPOSIT,
                Transaction::TYPE_TRANSFER_IN,
                Transaction::TYPE_DARET_PAYOUT,
                Transaction::TYPE_WITHDRAW,
                Transaction::TYPE_TRANSFER_OUT,
                Transaction::TYPE_DARET_CONTRIBUTION,
                Transaction::TYPE_REFUND,
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

    private function idempotencyKey(Request $request): ?string
    {
        $key = $request->header('Idempotency-Key') ?: $request->input('idempotency_key');

        if (! is_string($key) || trim($key) === '') {
            return null;
        }

        return substr(trim($key), 0, 120);
    }

    private function initials(string $name): string
    {
        $words = preg_split('/\s+/', trim($name)) ?: [];
        $initials = collect($words)
            ->filter()
            ->take(2)
            ->map(fn (string $word): string => mb_strtoupper(mb_substr($word, 0, 1)))
            ->implode('');

        return $initials !== '' ? $initials : 'DG';
    }
}
