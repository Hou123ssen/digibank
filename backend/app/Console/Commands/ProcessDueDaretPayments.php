<?php

namespace App\Console\Commands;

use App\Services\DaretService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ProcessDueDaretPayments extends Command
{
    protected $signature = 'daret:process-due-payments';

    protected $description = 'Automatically debit due monthly Daret contributions and process cycle payouts.';

    public function handle(DaretService $daretService): int
    {
        Log::info('Starting scheduled Daret due payment processing.');

        $summary = $daretService->processDuePayments();

        $this->info('Daret due payment processing completed.');
        foreach ($summary as $key => $value) {
            $this->line("{$key}: {$value}");
        }

        return self::SUCCESS;
    }
}
