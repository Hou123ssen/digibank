<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Rapport KYC DigiBank</title>
    <style>
        body {
            color: #111827;
            font-family: DejaVu Sans, sans-serif;
            font-size: 12px;
            line-height: 1.45;
            margin: 28px;
        }

        .header {
            border-bottom: 2px solid #10b981;
            margin-bottom: 20px;
            padding-bottom: 14px;
        }

        .logo {
            height: 44px;
            margin-bottom: 8px;
        }

        h1 {
            color: #064e3b;
            font-size: 22px;
            margin: 0;
        }

        h2 {
            color: #065f46;
            font-size: 15px;
            margin: 18px 0 8px;
        }

        table {
            border-collapse: collapse;
            width: 100%;
        }

        th,
        td {
            border: 1px solid #d1d5db;
            padding: 8px;
            text-align: left;
            vertical-align: top;
        }

        th {
            background: #f3f4f6;
            color: #374151;
            width: 34%;
        }

        .field-table th:first-child {
            width: 42%;
        }

        .field-table td {
            font-weight: 600;
        }

        .rtl {
            direction: rtl;
            font-family: DejaVu Sans, sans-serif;
            text-align: right;
            unicode-bidi: embed;
        }

        .muted {
            color: #6b7280;
        }

        .note {
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            color: #065f46;
            margin: 10px 0 14px;
            padding: 9px 10px;
        }

        .images {
            width: 100%;
        }

        .image-cell {
            width: 50%;
        }

        .cin-image {
            border: 1px solid #d1d5db;
            max-height: 230px;
            max-width: 100%;
            object-fit: contain;
        }
    </style>
</head>
<body>
    <div class="header">
        @if ($logoImage)
            <img class="logo" src="{{ $logoImage }}" alt="DigiBank">
        @endif
        <h1>DigiBank - Rapport de v&eacute;rification KYC</h1>
        <div class="muted">G&eacute;n&eacute;r&eacute; le {{ $generatedAt->format('d/m/Y H:i') }}</div>
    </div>

    <h2>V&eacute;rification OCR structur&eacute;e</h2>
    <div class="note">
        Les donn&eacute;es ci-dessous sont extraites automatiquement depuis les images CIN et servent d'aide &agrave; la revue employ&eacute;.
    </div>
    <table class="field-table">
        <tr>
            <th>Champ</th>
            <th>Valeur</th>
        </tr>
        @foreach ($ocrFields as $field)
            <tr>
                <th>{{ $field['label'] }}</th>
                <td class="{{ $field['rtl'] ? 'rtl' : '' }}">{{ $field['value'] }}</td>
            </tr>
        @endforeach
    </table>

    <h2>Images CIN</h2>
    <table class="images">
        <tr>
            <th class="image-cell">CIN recto</th>
            <th class="image-cell">CIN verso</th>
        </tr>
        <tr>
            <td class="image-cell">
                @if ($frontImage)
                    <img class="cin-image" src="{{ $frontImage }}" alt="CIN recto">
                @else
                    Non fourni
                @endif
            </td>
            <td class="image-cell">
                @if ($backImage)
                    <img class="cin-image" src="{{ $backImage }}" alt="CIN verso">
                @else
                    Non fourni
                @endif
            </td>
        </tr>
    </table>

</body>
</html>
