<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function me(Request $request)
    {
        $transactions = $request->user()
            ->transactions()
            ->select([
                'id',
                'account_id',
                'related_account_id',
                'type',
                'amount',
                'balance_before',
                'balance_after',
                'status',
                'reference',
                'description',
                'is_overdraft',
                'overdraft_amount',
                'created_at',
            ])
            ->with(['account:id,account_number', 'relatedAccount:id,account_number'])
            ->latest()
            ->get();

        return ApiResponse::success('Transactions retrieved successfully.', [
            'transactions' => $transactions,
        ]);
    }
}
