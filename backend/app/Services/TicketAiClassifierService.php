<?php

namespace App\Services;

use App\Models\Ticket;

class TicketAiClassifierService
{
    private const LANGUAGE_ARABIC = 'arabic';
    private const LANGUAGE_FRENCH = 'french';
    private const LANGUAGE_ENGLISH = 'english';

    public function analyze(string $description): array
    {
        $text = $this->normalize($description);
        $language = $this->detectLanguage($text);
        $category = $this->category($text);
        $sentiment = $this->sentiment($text);
        $priority = $this->priority($text, $sentiment['value']);
        $urgentDetected = $priority === Ticket::PRIORITY_URGENT;

        return [
            'category' => $category['value'],
            'priority' => $priority,
            'sentiment' => $sentiment['value'],
            'ai_suggested_reply' => $this->reply($category['value'], $priority, $language),
            'ai_confidence' => $this->confidence($category['matched'], $sentiment['matched'], $urgentDetected),
        ];
    }

    /**
     * Deterministic rule-based category detection.
     * Keywords are intentionally multilingual and no external AI/API calls are used.
     */
    private function category(string $text): array
    {
        $rules = [
            Ticket::CATEGORY_DARET => ['daret', 'دارت', 'الدارت', 'tontine'],
            Ticket::CATEGORY_TRANSFER => ['transfer', 'virement', 'تحويل', 'حوالة', 'money transfer', 'send money', 'فلوس ما وصلاتش'],
            Ticket::CATEGORY_KYC => ['kyc', 'cin', 'identity', 'identité', 'carte nationale', 'بطاقة التعريف', 'الهوية'],
            Ticket::CATEGORY_CARD => ['card', 'carte', 'carte bancaire', 'credit card', 'debit card', 'البطاقة', 'carte bloquée'],
            Ticket::CATEGORY_ACCOUNT => ['account', 'compte', 'حساب', 'solde', 'balance'],
        ];

        foreach ($rules as $category => $keywords) {
            if ($this->containsAny($text, $keywords)) {
                return ['value' => $category, 'matched' => true];
            }
        }

        return ['value' => Ticket::CATEGORY_ACCOUNT, 'matched' => false];
    }

    /**
     * Priority stays rule-based: urgent keywords win, negative sentiment becomes high,
     * and everything else defaults to medium.
     */
    private function priority(string $text, string $sentiment): string
    {
        $urgentKeywords = [
            'urgent',
            'very urgent',
            'blocked',
            'stolen',
            'fraud',
            'bloqué',
            'volé',
            'fraude',
            'عاجل',
            'سرقة',
            'مسروق',
            'نصب',
        ];

        if ($this->containsAny($text, $urgentKeywords)) {
            return Ticket::PRIORITY_URGENT;
        }

        return $sentiment === Ticket::SENTIMENT_NEGATIVE
            ? Ticket::PRIORITY_HIGH
            : Ticket::PRIORITY_MEDIUM;
    }

    /**
     * Sentiment is deliberately simple: any negative keyword means negative,
     * otherwise the classifier returns neutral.
     */
    private function sentiment(string $text): array
    {
        $negativeKeywords = [
            'problem',
            'bad',
            'scam',
            'fraud',
            'not working',
            'angry',
            'problème',
            'erreur',
            'bloqué',
            'arnaque',
            'fraude',
            'mauvais',
            'مشكل',
            'ما خدامش',
            'سرقة',
            'نصب',
            'ما وصلاتش',
            'فلوسي',
            'زعفان',
            'غضبان',
        ];

        if ($this->containsAny($text, $negativeKeywords)) {
            return ['value' => Ticket::SENTIMENT_NEGATIVE, 'matched' => true];
        }

        return ['value' => Ticket::SENTIMENT_NEUTRAL, 'matched' => false];
    }

    /**
     * Replies are contextual, not generic: the template is selected by
     * category + priority, then returned in the detected user language.
     */
    private function reply(string $category, string $priority, string $language): string
    {
        $templates = $this->replyTemplates();
        $languageTemplates = $templates[$language] ?? $templates[self::LANGUAGE_ARABIC];
        $categoryTemplates = $languageTemplates[$category] ?? $languageTemplates[Ticket::CATEGORY_ACCOUNT];

        return $categoryTemplates[$priority]
            ?? $categoryTemplates[Ticket::PRIORITY_MEDIUM];
    }

    private function replyTemplates(): array
    {
        return [
            self::LANGUAGE_ARABIC => [
                Ticket::CATEGORY_DARET => [
                    Ticket::PRIORITY_URGENT => 'توصلنا بطلبك المستعجل بخصوص الدارت، نعمل حالياً على مراجعة المشاركة أو الأداء وسنوافيك بالتفاصيل في أقرب وقت.',
                    Ticket::PRIORITY_HIGH => 'توصلنا بطلبك بخصوص الدارت، سنراجع المشكل بعناية ونرد عليك قريباً.',
                    Ticket::PRIORITY_MEDIUM => 'توصلنا بطلبك بخصوص الدارت، سيتم تتبعه من طرف الفريق المختص.',
                    Ticket::PRIORITY_LOW => 'توصلنا بسؤالك حول الدارت، وسنقدم لك المساعدة المناسبة.',
                ],
                Ticket::CATEGORY_TRANSFER => [
                    Ticket::PRIORITY_URGENT => 'توصلنا بطلبك المستعجل بخصوص التحويل، نعمل حالياً على التحقق من العملية وسنوافيك بالتفاصيل في أقرب وقت.',
                    Ticket::PRIORITY_HIGH => 'توصلنا بطلبك بخصوص التحويل، سنراجع حالة العملية ونتواصل معك قريباً.',
                    Ticket::PRIORITY_MEDIUM => 'توصلنا بطلبك بخصوص التحويل، سيتم التحقق من المعطيات والرد عليك.',
                    Ticket::PRIORITY_LOW => 'توصلنا بسؤالك حول التحويل، وسنقدم لك التوضيحات اللازمة.',
                ],
                Ticket::CATEGORY_KYC => [
                    Ticket::PRIORITY_URGENT => 'توصلنا بطلبك المستعجل بخصوص التحقق من الهوية، سنراجع ملفك في أقرب وقت ممكن.',
                    Ticket::PRIORITY_HIGH => 'توصلنا بطلبك بخصوص التحقق من الهوية، سنراجع الوثائق ونخبرك بالخطوات القادمة.',
                    Ticket::PRIORITY_MEDIUM => 'توصلنا بطلبك بخصوص التحقق من الهوية، سيتم تتبع حالة ملفك.',
                    Ticket::PRIORITY_LOW => 'توصلنا بسؤالك حول التحقق من الهوية، وسنساعدك بالمعلومات المطلوبة.',
                ],
                Ticket::CATEGORY_CARD => [
                    Ticket::PRIORITY_URGENT => 'توصلنا بطلبك المستعجل بخصوص البطاقة البنكية، نعمل حالياً على التحقق من الحالة لحماية حسابك.',
                    Ticket::PRIORITY_HIGH => 'توصلنا بطلبك بخصوص البطاقة البنكية، سنراجع المشكل ونعود إليك قريباً.',
                    Ticket::PRIORITY_MEDIUM => 'توصلنا بطلبك بخصوص البطاقة البنكية، سيتم تتبع الحالة من طرف الفريق المختص.',
                    Ticket::PRIORITY_LOW => 'توصلنا بسؤالك حول البطاقة البنكية، وسنقدم لك المساعدة المناسبة.',
                ],
                Ticket::CATEGORY_ACCOUNT => [
                    Ticket::PRIORITY_URGENT => 'توصلنا بطلبك المستعجل بخصوص الحساب، نعمل حالياً على مراجعة الوضع وسنوافيك بالتفاصيل قريباً.',
                    Ticket::PRIORITY_HIGH => 'توصلنا بطلبك بخصوص الحساب، سنراجع المشكل ونرد عليك في أقرب وقت.',
                    Ticket::PRIORITY_MEDIUM => 'توصلنا بطلبك بخصوص الحساب، سيتم تتبع حالتك من طرف الفريق المختص.',
                    Ticket::PRIORITY_LOW => 'توصلنا بسؤالك حول الحساب، وسنقدم لك التوضيحات اللازمة.',
                ],
            ],
            self::LANGUAGE_FRENCH => [
                Ticket::CATEGORY_DARET => [
                    Ticket::PRIORITY_URGENT => 'Nous avons reçu votre demande urgente concernant la daret, nous vérifions actuellement la participation ou le paiement et vous répondrons bientôt.',
                    Ticket::PRIORITY_HIGH => 'Nous avons reçu votre demande concernant la daret, nous allons examiner le problème attentivement et vous répondrons bientôt.',
                    Ticket::PRIORITY_MEDIUM => 'Nous avons reçu votre demande concernant la daret, notre équipe va suivre votre dossier.',
                    Ticket::PRIORITY_LOW => 'Nous avons reçu votre question concernant la daret et nous vous apporterons l’aide nécessaire.',
                ],
                Ticket::CATEGORY_TRANSFER => [
                    Ticket::PRIORITY_URGENT => 'Nous avons reçu votre demande urgente concernant le virement, nous sommes en train de vérifier et vous répondrons bientôt.',
                    Ticket::PRIORITY_HIGH => 'Nous avons reçu votre demande concernant le virement, nous allons vérifier l’opération et vous répondrons bientôt.',
                    Ticket::PRIORITY_MEDIUM => 'Nous avons reçu votre demande concernant le virement, nous allons vérifier les informations et revenir vers vous.',
                    Ticket::PRIORITY_LOW => 'Nous avons reçu votre question concernant le virement et nous vous fournirons les précisions nécessaires.',
                ],
                Ticket::CATEGORY_KYC => [
                    Ticket::PRIORITY_URGENT => 'Nous avons reçu votre demande urgente concernant la vérification d’identité, nous allons examiner votre dossier dès que possible.',
                    Ticket::PRIORITY_HIGH => 'Nous avons reçu votre demande concernant la vérification d’identité, nous allons vérifier vos documents et vous indiquer les prochaines étapes.',
                    Ticket::PRIORITY_MEDIUM => 'Nous avons reçu votre demande concernant la vérification d’identité, notre équipe va suivre l’état de votre dossier.',
                    Ticket::PRIORITY_LOW => 'Nous avons reçu votre question concernant la vérification d’identité et nous vous aiderons avec les informations nécessaires.',
                ],
                Ticket::CATEGORY_CARD => [
                    Ticket::PRIORITY_URGENT => 'Nous avons reçu votre demande urgente concernant la carte bancaire, nous vérifions actuellement la situation afin de protéger votre compte.',
                    Ticket::PRIORITY_HIGH => 'Nous avons reçu votre demande concernant la carte bancaire, nous allons examiner le problème et vous répondrons bientôt.',
                    Ticket::PRIORITY_MEDIUM => 'Nous avons reçu votre demande concernant la carte bancaire, notre équipe va suivre la situation.',
                    Ticket::PRIORITY_LOW => 'Nous avons reçu votre question concernant la carte bancaire et nous vous apporterons l’aide nécessaire.',
                ],
                Ticket::CATEGORY_ACCOUNT => [
                    Ticket::PRIORITY_URGENT => 'Nous avons reçu votre demande urgente concernant le compte, nous examinons actuellement la situation et vous répondrons bientôt.',
                    Ticket::PRIORITY_HIGH => 'Nous avons reçu votre demande concernant le compte, nous allons examiner le problème et vous répondrons rapidement.',
                    Ticket::PRIORITY_MEDIUM => 'Nous avons reçu votre demande concernant le compte, notre équipe va suivre votre situation.',
                    Ticket::PRIORITY_LOW => 'Nous avons reçu votre question concernant le compte et nous vous fournirons les précisions nécessaires.',
                ],
            ],
            self::LANGUAGE_ENGLISH => [
                Ticket::CATEGORY_DARET => [
                    Ticket::PRIORITY_URGENT => 'We have received your urgent daret request, we are currently reviewing the participation or payment and will get back to you shortly.',
                    Ticket::PRIORITY_HIGH => 'We have received your daret request, we will review the issue carefully and get back to you soon.',
                    Ticket::PRIORITY_MEDIUM => 'We have received your daret request, our team will follow up on your case.',
                    Ticket::PRIORITY_LOW => 'We have received your daret question and will provide the appropriate support.',
                ],
                Ticket::CATEGORY_TRANSFER => [
                    Ticket::PRIORITY_URGENT => 'We have received your urgent transfer request, we are currently reviewing it and will get back to you shortly.',
                    Ticket::PRIORITY_HIGH => 'We have received your transfer request, we will check the operation and get back to you soon.',
                    Ticket::PRIORITY_MEDIUM => 'We have received your transfer request, we will verify the details and reply to you.',
                    Ticket::PRIORITY_LOW => 'We have received your transfer question and will provide the needed clarification.',
                ],
                Ticket::CATEGORY_KYC => [
                    Ticket::PRIORITY_URGENT => 'We have received your urgent identity verification request, we will review your file as soon as possible.',
                    Ticket::PRIORITY_HIGH => 'We have received your identity verification request, we will review your documents and share the next steps.',
                    Ticket::PRIORITY_MEDIUM => 'We have received your identity verification request, our team will follow up on your file.',
                    Ticket::PRIORITY_LOW => 'We have received your identity verification question and will help you with the required information.',
                ],
                Ticket::CATEGORY_CARD => [
                    Ticket::PRIORITY_URGENT => 'We have received your urgent card request, we are currently checking the situation to protect your account.',
                    Ticket::PRIORITY_HIGH => 'We have received your card request, we will review the issue and get back to you soon.',
                    Ticket::PRIORITY_MEDIUM => 'We have received your card request, our team will follow up on the situation.',
                    Ticket::PRIORITY_LOW => 'We have received your card question and will provide the appropriate support.',
                ],
                Ticket::CATEGORY_ACCOUNT => [
                    Ticket::PRIORITY_URGENT => 'We have received your urgent account request, we are currently reviewing the situation and will get back to you shortly.',
                    Ticket::PRIORITY_HIGH => 'We have received your account request, we will review the issue and reply as soon as possible.',
                    Ticket::PRIORITY_MEDIUM => 'We have received your account request, our team will follow up on your case.',
                    Ticket::PRIORITY_LOW => 'We have received your account question and will provide the needed clarification.',
                ],
            ],
        ];
    }

    /**
     * Lightweight language detection for choosing the reply language.
     * Arabic script wins first, then French banking/support words, then English words.
     */
    private function detectLanguage(string $text): string
    {
        if (preg_match('/\p{Arabic}/u', $text) === 1) {
            return self::LANGUAGE_ARABIC;
        }

        if ($this->containsAny($text, [
            'virement',
            'problème',
            'erreur',
            'bloqué',
            'bloquée',
            'fraude',
            'compte',
            'carte',
            'identité',
            'argent',
            'arrivé',
            'demande',
            'bonjour',
            'merci',
        ])) {
            return self::LANGUAGE_FRENCH;
        }

        if ($this->containsAny($text, [
            'transfer',
            'card',
            'account',
            'identity',
            'urgent',
            'blocked',
            'money',
            'help',
            'problem',
        ])) {
            return self::LANGUAGE_ENGLISH;
        }

        return self::LANGUAGE_ARABIC;
    }

    private function confidence(bool $categoryMatched, bool $sentimentMatched, bool $urgentDetected): int
    {
        if ($categoryMatched && $urgentDetected) {
            return 90;
        }

        if ($categoryMatched) {
            return 85;
        }

        if ($sentimentMatched) {
            return 70;
        }

        return 60;
    }

    /**
     * mb_strtolower keeps Arabic/French text safe while normalizing UTF-8 input.
     */
    private function normalize(string $text): string
    {
        return mb_strtolower(trim($text), 'UTF-8');
    }

    private function containsAny(string $text, array $keywords): bool
    {
        foreach ($keywords as $keyword) {
            if (str_contains($text, $this->normalize($keyword))) {
                return true;
            }
        }

        return false;
    }
}
