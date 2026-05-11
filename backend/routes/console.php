<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Services\DaretService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('darets:mark-late-payments', function (DaretService $daretService) {
    $count = $daretService->markLatePayments();
    $this->info("Marked {$count} Daret payment(s) as late.");
})->purpose('Mark overdue Daret payments as late and notify members');

Schedule::command('daret:process-due-payments')->daily();
