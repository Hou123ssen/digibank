<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Support\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use ZipArchive;

class TransactionController extends Controller
{
    public function me(Request $request)
    {
        $filters = $this->validatedFilters($request);

        if ($request->query() === []) {
            $transactions = $this->ledgerQuery($request, $filters)
                ->latest()
                ->get()
                ->map(fn (Transaction $transaction): array => $this->ledgerRow($transaction));

            return ApiResponse::success('Transactions retrieved successfully.', [
                'transactions' => $transactions,
                'summary' => $this->statementSummary($this->ledgerQuery($request, $filters)->get(), $request),
            ]);
        }

        $perPage = (int) ($filters['per_page'] ?? 15);

        $transactions = $this->ledgerQuery($request, $filters)
            ->latest()
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Transaction $transaction): array => $this->ledgerRow($transaction));

        return ApiResponse::success('Transactions retrieved successfully.', [
            'transactions' => $transactions,
            'summary' => $this->statementSummary($this->ledgerQuery($request, $filters)->get(), $request),
        ]);
    }

    public function statement(Request $request)
    {
        $filters = $this->validatedFilters($request);
        [$periodStart, $periodEnd] = $this->statementPeriod($request);
        $filters['date_from'] = $periodStart->toDateString();
        $filters['date_to'] = $periodEnd->toDateString();

        $transactions = $this->ledgerQuery($request, $filters)
            ->oldest()
            ->get();

        return ApiResponse::success('Monthly statement retrieved successfully.', [
            'period' => [
                'start' => $periodStart,
                'end' => $periodEnd,
                'month' => $periodStart->format('Y-m'),
            ],
            'account' => $request->user()->account,
            'summary' => $this->statementSummary($transactions, $request),
            'transactions' => $transactions->map(fn (Transaction $transaction): array => $this->ledgerRow($transaction))->values(),
            'anomalies' => $this->anomalySummary($transactions),
        ]);
    }

    public function exportPdf(Request $request)
    {
        $filters = $this->validatedFilters($request);
        $transactions = $this->exportTransactions($request, $filters);
        $generatedAt = now();

        $pdf = Pdf::loadView('pdf.transactions-export', [
            'user' => $request->user(),
            'transactions' => $transactions,
            'summary' => $this->statementSummary($this->ledgerQuery($request, $filters)->get(), $request),
            'generatedAt' => $generatedAt,
        ])
            ->setPaper('a4')
            ->setOptions([
                'defaultFont' => 'DejaVu Sans',
                'isHtml5ParserEnabled' => true,
                'isFontSubsettingEnabled' => true,
            ]);

        return $pdf->download('transactions-digibank.pdf');
    }

    public function exportExcel(Request $request)
    {
        $transactions = $this->exportTransactions($request, $this->validatedFilters($request));
        $path = tempnam(sys_get_temp_dir(), 'digibank-transactions-');

        $zip = new ZipArchive();
        $zip->open($path, ZipArchive::OVERWRITE);
        $zip->addFromString('[Content_Types].xml', $this->contentTypesXml());
        $zip->addFromString('_rels/.rels', $this->relsXml());
        $zip->addFromString('xl/workbook.xml', $this->workbookXml());
        $zip->addFromString('xl/_rels/workbook.xml.rels', $this->workbookRelsXml());
        $zip->addFromString('xl/styles.xml', $this->stylesXml());
        $zip->addFromString('xl/worksheets/sheet1.xml', $this->worksheetXml($transactions));
        $zip->close();

        return response()->download($path, 'transactions-digibank.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    public function exportCsv(Request $request)
    {
        $transactions = $this->exportTransactions($request, $this->validatedFilters($request));
        $csv = fopen('php://temp', 'r+');
        fputcsv($csv, ['Date', 'Type', 'Reference', 'Description', 'Amount', 'Balance Before', 'Balance After', 'Status', 'Anomaly Flags']);

        foreach ($transactions as $transaction) {
            fputcsv($csv, [
                $transaction['date']?->format('Y-m-d H:i:s') ?? '',
                $transaction['type'],
                $transaction['reference'],
                $transaction['description'],
                $transaction['amount'],
                $transaction['balance_before'],
                $transaction['balance_after'],
                $transaction['status'],
                implode('|', $transaction['anomaly_flags'] ?? []),
            ]);
        }

        rewind($csv);
        $content = stream_get_contents($csv);
        fclose($csv);

        return response($content, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="transactions-digibank.csv"',
        ]);
    }

    public function statementPdf(Request $request)
    {
        [$periodStart, $periodEnd] = $this->statementPeriod($request);
        $filters = $this->validatedFilters($request);
        $filters['date_from'] = $periodStart->toDateString();
        $filters['date_to'] = $periodEnd->toDateString();

        $transactions = $this->ledgerQuery($request, $filters)->oldest()->get();

        $pdf = Pdf::loadView('pdf.account-statement', [
            'user' => $request->user(),
            'account' => $request->user()->account,
            'transactions' => $transactions,
            'summary' => $this->statementSummary($transactions, $request),
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

        return $pdf->download('releve-digibank-'.$periodStart->format('Y-m').'.pdf');
    }

    private function exportTransactions(Request $request, array $filters): Collection
    {
        return $this->ledgerQuery($request, $filters)
            ->latest()
            ->get()
            ->map(function (Transaction $transaction): array {
                $signedAmount = $this->signedAmount($transaction);

                return [
                    'type' => $transaction->type,
                    'date' => $transaction->created_at,
                    'reference' => $transaction->reference,
                    'amount' => $signedAmount,
                    'formatted_amount' => $this->formatAmount($signedAmount),
                    'status' => $transaction->status,
                    'description' => $transaction->description,
                    'balance_before' => $transaction->balance_before,
                    'balance_after' => $transaction->balance_after,
                    'anomaly_flags' => $this->anomalyFlags($transaction),
                ];
            });
    }

    private function ledgerQuery(Request $request, array $filters)
    {
        return $request->user()
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
            ->with(['account:id,account_number,balance', 'relatedAccount:id,account_number'])
            ->when(($filters['type'] ?? 'all') !== 'all', function ($query) use ($filters): void {
                $type = $filters['type'];
                if ($type === 'transfer') {
                    $query->whereIn('type', [Transaction::TYPE_TRANSFER_IN, Transaction::TYPE_TRANSFER_OUT]);
                } elseif ($type === 'daret') {
                    $query->whereIn('type', [Transaction::TYPE_DARET_CONTRIBUTION, Transaction::TYPE_DARET_PAYOUT]);
                } elseif ($type === 'cagnotte') {
                    $query->where('type', Transaction::TYPE_WITHDRAW)->where('description', 'like', 'Donation to cagnotte%');
                } else {
                    $query->where('type', $type);
                }
            })
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($inner) use ($search): void {
                    $inner
                        ->where('reference', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('type', 'like', "%{$search}%");
                });
            })
            ->when($filters['date_from'] ?? null, fn ($query, string $date) => $query->whereDate('created_at', '>=', $date))
            ->when($filters['date_to'] ?? null, fn ($query, string $date) => $query->whereDate('created_at', '<=', $date))
            ->when(isset($filters['amount_min']), fn ($query) => $query->whereRaw('ABS(amount) >= ?', [$filters['amount_min']]))
            ->when(isset($filters['amount_max']), fn ($query) => $query->whereRaw('ABS(amount) <= ?', [$filters['amount_max']]));
    }

    private function ledgerRow(Transaction $transaction): array
    {
        $signedAmount = $this->signedAmount($transaction);

        return [
            'id' => $transaction->id,
            'account_id' => $transaction->account_id,
            'account_number' => $transaction->account?->account_number,
            'related_account_number' => $transaction->relatedAccount?->account_number,
            'type' => $transaction->type,
            'amount' => $transaction->amount,
            'signed_amount' => round($signedAmount, 2),
            'formatted_amount' => $this->formatAmount($signedAmount),
            'balance_before' => $transaction->balance_before,
            'balance_after' => $transaction->balance_after,
            'running_balance' => $transaction->balance_after,
            'status' => $transaction->status,
            'reference' => $transaction->reference,
            'description' => $transaction->description,
            'is_overdraft' => $transaction->is_overdraft,
            'overdraft_amount' => $transaction->overdraft_amount,
            'anomaly_flags' => $this->anomalyFlags($transaction),
            'created_at' => $transaction->created_at,
        ];
    }

    private function validatedFilters(Request $request): array
    {
        return $request->validate([
            'type' => ['nullable', Rule::in(['all', Transaction::TYPE_DEPOSIT, Transaction::TYPE_WITHDRAW, Transaction::TYPE_TRANSFER_IN, Transaction::TYPE_TRANSFER_OUT, Transaction::TYPE_REFUND, 'transfer', 'daret', 'cagnotte'])],
            'status' => ['nullable', Rule::in([Transaction::STATUS_SUCCESS, Transaction::STATUS_FAILED, Transaction::STATUS_PENDING])],
            'search' => ['nullable', 'string', 'max:120'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'amount_min' => ['nullable', 'numeric', 'min:0'],
            'amount_max' => ['nullable', 'numeric', 'gte:amount_min'],
            'month' => ['nullable', 'date_format:Y-m'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);
    }

    private function statementPeriod(Request $request): array
    {
        $month = $request->query('month');
        $start = $month ? Carbon::createFromFormat('Y-m', $month)->startOfMonth() : now()->startOfMonth();

        return [$start->copy(), $start->copy()->endOfMonth()];
    }

    private function statementSummary(Collection $transactions, Request $request): array
    {
        $inflows = $transactions->filter(fn (Transaction $transaction) => $this->signedAmount($transaction) > 0)->sum(fn (Transaction $transaction) => $this->signedAmount($transaction));
        $outflows = abs($transactions->filter(fn (Transaction $transaction) => $this->signedAmount($transaction) < 0)->sum(fn (Transaction $transaction) => $this->signedAmount($transaction)));

        return [
            'opening_balance' => optional($transactions->sortBy('created_at')->first())->balance_before ?? $request->user()->account?->balance ?? 0,
            'closing_balance' => optional($transactions->sortByDesc('created_at')->first())->balance_after ?? $request->user()->account?->balance ?? 0,
            'total_inflows' => round((float) $inflows, 2),
            'total_outflows' => round((float) $outflows, 2),
            'net_flow' => round((float) $inflows - (float) $outflows, 2),
            'transactions_count' => $transactions->count(),
            'anomalies_count' => $transactions->filter(fn (Transaction $transaction) => $this->anomalyFlags($transaction) !== [])->count(),
        ];
    }

    private function anomalyFlags(Transaction $transaction): array
    {
        $flags = [];
        $amount = abs((float) $transaction->amount);

        if ($amount >= 10000) {
            $flags[] = 'large_amount';
        }

        if ($transaction->is_overdraft || (float) $transaction->balance_after < 0) {
            $flags[] = 'overdraft';
        }

        if ($transaction->status !== Transaction::STATUS_SUCCESS) {
            $flags[] = 'non_success_status';
        }

        if (abs(((float) $transaction->balance_after - (float) $transaction->balance_before) - $this->signedAmount($transaction)) > 0.01) {
            $flags[] = 'ledger_mismatch';
        }

        return $flags;
    }

    private function anomalySummary(Collection $transactions): array
    {
        return $transactions
            ->flatMap(fn (Transaction $transaction) => $this->anomalyFlags($transaction))
            ->countBy()
            ->all();
    }

    private function signedAmount(Transaction $transaction): float
    {
        $amount = abs((float) $transaction->amount);

        return in_array($transaction->type, [
            Transaction::TYPE_DEPOSIT,
            Transaction::TYPE_TRANSFER_IN,
            Transaction::TYPE_DARET_PAYOUT,
        ], true) ? $amount : -$amount;
    }

    private function formatAmount(float $amount): string
    {
        return ($amount >= 0 ? '+' : '-') . number_format(abs($amount), 2, ',', ' ') . ' MAD';
    }

    private function worksheetXml(Collection $transactions): string
    {
        $rows = [
            ['Type', 'Date', 'Reference', 'Amount', 'Balance Before', 'Balance After', 'Status', 'Description'],
        ];

        foreach ($transactions as $transaction) {
            $rows[] = [
                str_replace('_', ' ', $transaction['type']),
                $transaction['date']?->format('d/m/Y H:i') ?? '',
                $transaction['reference'] ?? '',
                $transaction['formatted_amount'],
                $transaction['balance_before'] ?? '',
                $transaction['balance_after'] ?? '',
                $transaction['status'] ?? '',
                $transaction['description'] ?? '',
            ];
        }

        $xmlRows = '';
        foreach ($rows as $rowIndex => $row) {
            $xmlRows .= '<row r="' . ($rowIndex + 1) . '">';
            foreach ($row as $columnIndex => $value) {
                $cell = $this->columnName($columnIndex + 1) . ($rowIndex + 1);
                $style = $rowIndex === 0 ? ' s="1"' : '';
                $xmlRows .= '<c r="' . $cell . '" t="inlineStr"' . $style . '><is><t>' . $this->xml($value) . '</t></is></c>';
            }
            $xmlRows .= '</row>';
        }

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<cols><col min="1" max="8" width="24" customWidth="1"/></cols>'
            . '<sheetData>' . $xmlRows . '</sheetData>'
            . '</worksheet>';
    }

    private function columnName(int $number): string
    {
        $name = '';
        while ($number > 0) {
            $number--;
            $name = chr(65 + ($number % 26)) . $name;
            $number = intdiv($number, 26);
        }

        return $name;
    }

    private function xml(mixed $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    private function contentTypesXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            . '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            . '</Types>';
    }

    private function relsXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '</Relationships>';
    }

    private function workbookXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<sheets><sheet name="Transactions" sheetId="1" r:id="rId1"/></sheets>'
            . '</workbook>';
    }

    private function workbookRelsXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            . '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            . '</Relationships>';
    }

    private function stylesXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
            . '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>'
            . '<borders count="1"><border/></borders>'
            . '<cellStyleXfs count="1"><xf fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            . '<cellXfs count="2"><xf fontId="0" fillId="0" borderId="0" xfId="0"/><xf fontId="1" fillId="0" borderId="0" xfId="0"/></cellXfs>'
            . '</styleSheet>';
    }
}
