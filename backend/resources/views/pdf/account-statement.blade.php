<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Relev&eacute; DigiBank</title>
    <style>
        body {
            color: #111827;
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
            line-height: 1.45;
            margin: 28px;
        }

        .header {
            border-bottom: 2px solid #10b981;
            margin-bottom: 18px;
            padding-bottom: 12px;
        }

        h1 {
            color: #064e3b;
            font-size: 24px;
            margin: 0 0 4px;
        }

        h2 {
            color: #065f46;
            font-size: 15px;
            margin: 18px 0 8px;
        }

        .muted {
            color: #6b7280;
        }

        .summary {
            margin: 12px 0 18px;
            width: 100%;
        }

        table {
            border-collapse: collapse;
            width: 100%;
        }

        th,
        td {
            border: 1px solid #d1d5db;
            padding: 7px;
            text-align: left;
            vertical-align: top;
        }

        th {
            background: #f3f4f6;
            color: #374151;
            font-weight: 700;
        }

        .amount {
            font-family: DejaVu Sans Mono, DejaVu Sans, monospace;
            text-align: right;
            white-space: nowrap;
        }

        .positive {
            color: #047857;
        }

        .negative {
            color: #be123c;
        }

        .empty {
            color: #6b7280;
            padding: 14px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>DigiBank - Relev&eacute; de compte</h1>
        <div class="muted">G&eacute;n&eacute;r&eacute; le {{ $generatedAt->format('d/m/Y H:i') }}</div>
    </div>

    <table class="summary">
        <tr>
            <th>Titulaire</th>
            <td>{{ $user->name }}</td>
            <th>Num&eacute;ro de compte</th>
            <td>{{ $account->account_number }}</td>
        </tr>
        <tr>
            <th>Solde actuel</th>
            <td class="amount">{{ number_format((float) $account->balance, 2, ',', ' ') }} MAD</td>
            <th>P&eacute;riode</th>
            <td>{{ $periodStart->format('d/m/Y') }} - {{ $periodEnd->format('d/m/Y') }}</td>
        </tr>
    </table>

    <h2>R&eacute;capitulatif</h2>
    <table>
        <tr>
            <th>Total d&eacute;p&ocirc;ts et virements re&ccedil;us</th>
            <td class="amount positive">{{ number_format((float) $summary['monthly_inflows'], 2, ',', ' ') }} MAD</td>
        </tr>
        <tr>
            <th>Total retraits et virements envoy&eacute;s</th>
            <td class="amount negative">{{ number_format((float) $summary['monthly_outflows'], 2, ',', ' ') }} MAD</td>
        </tr>
        <tr>
            <th>Flux net</th>
            <td class="amount {{ (float) $summary['net_flow'] >= 0 ? 'positive' : 'negative' }}">
                {{ number_format((float) $summary['net_flow'], 2, ',', ' ') }} MAD
            </td>
        </tr>
    </table>

    <h2>Transactions</h2>
    <table>
        <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Description</th>
            <th>R&eacute;f&eacute;rence</th>
            <th>Montant</th>
            <th>Solde apr&egrave;s</th>
        </tr>
        @forelse ($transactions as $transaction)
            @php
                $isInflow = in_array($transaction->type, [
                    \App\Models\Transaction::TYPE_DEPOSIT,
                    \App\Models\Transaction::TYPE_TRANSFER_IN,
                ], true);
            @endphp
            <tr>
                <td>{{ $transaction->created_at->format('d/m/Y H:i') }}</td>
                <td>{{ str_replace('_', ' ', $transaction->type) }}</td>
                <td>{{ $transaction->description ?: '-' }}</td>
                <td>{{ $transaction->reference }}</td>
                <td class="amount {{ $isInflow ? 'positive' : 'negative' }}">
                    {{ $isInflow ? '+' : '-' }}{{ number_format((float) $transaction->amount, 2, ',', ' ') }} MAD
                </td>
                <td class="amount">{{ number_format((float) $transaction->balance_after, 2, ',', ' ') }} MAD</td>
            </tr>
        @empty
            <tr>
                <td class="empty" colspan="6">Aucune transaction pour cette p&eacute;riode.</td>
            </tr>
        @endforelse
    </table>
</body>
</html>
