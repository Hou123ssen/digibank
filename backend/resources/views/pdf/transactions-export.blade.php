<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Transactions DigiBank</title>
    <style>
        body { color: #111827; font-family: DejaVu Sans, sans-serif; font-size: 11px; margin: 28px; }
        .header { border-bottom: 2px solid #10b981; margin-bottom: 18px; padding-bottom: 12px; }
        h1 { color: #064e3b; font-size: 24px; margin: 0 0 4px; }
        .muted { color: #6b7280; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #d1d5db; padding: 7px; text-align: left; vertical-align: top; }
        th { background: #f3f4f6; color: #374151; font-weight: 700; }
        .amount { font-family: DejaVu Sans Mono, DejaVu Sans, monospace; text-align: right; white-space: nowrap; }
        .positive { color: #047857; }
        .negative { color: #be123c; }
        .empty { color: #6b7280; padding: 14px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>DigiBank - Transactions</h1>
        <div class="muted">Titulaire : {{ $user->name }}</div>
        <div class="muted">G&eacute;n&eacute;r&eacute; le {{ $generatedAt->format('d/m/Y H:i') }}</div>
    </div>

    <table>
        <tr>
            <th>Type</th>
            <th>Date</th>
            <th>R&eacute;f&eacute;rence</th>
            <th>Montant</th>
            <th>Statut</th>
        </tr>
        @forelse ($transactions as $transaction)
            <tr>
                <td>{{ str_replace('_', ' ', $transaction['type']) }}</td>
                <td>{{ $transaction['date']?->format('d/m/Y H:i') }}</td>
                <td>{{ $transaction['reference'] }}</td>
                <td class="amount {{ (float) $transaction['amount'] >= 0 ? 'positive' : 'negative' }}">
                    {{ $transaction['formatted_amount'] }}
                </td>
                <td>{{ $transaction['status'] }}</td>
            </tr>
        @empty
            <tr>
                <td class="empty" colspan="5">Aucune transaction disponible.</td>
            </tr>
        @endforelse
    </table>
</body>
</html>
