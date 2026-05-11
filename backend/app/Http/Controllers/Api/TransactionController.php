<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Support\ApiResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use ZipArchive;

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

    public function exportPdf(Request $request)
    {
        $transactions = $this->userTransactions($request);
        $generatedAt = now();

        $pdf = Pdf::loadView('pdf.transactions-export', [
            'user' => $request->user(),
            'transactions' => $transactions,
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
        $transactions = $this->userTransactions($request);
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

    private function userTransactions(Request $request): Collection
    {
        return $request->user()
            ->transactions()
            ->select([
                'id',
                'type',
                'amount',
                'status',
                'reference',
                'description',
                'created_at',
            ])
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
                ];
            });
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
            ['Type', 'Date', 'Reference', 'Amount', 'Status', 'Description'],
        ];

        foreach ($transactions as $transaction) {
            $rows[] = [
                str_replace('_', ' ', $transaction['type']),
                $transaction['date']?->format('d/m/Y H:i') ?? '',
                $transaction['reference'] ?? '',
                $transaction['formatted_amount'],
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
            . '<cols><col min="1" max="6" width="24" customWidth="1"/></cols>'
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
