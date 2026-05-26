<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RealtimeBroadcastService
{
    public function afterCommit(callable $eventFactory, string $eventName, array $context = []): void
    {
        $callback = function () use ($eventFactory, $eventName, $context): void {
            try {
                event($eventFactory());
            } catch (\Throwable $e) {
                Log::warning('Realtime broadcast dispatch failed.', array_merge($context, [
                    'event' => $eventName,
                    'error' => $e->getMessage(),
                ]));
            }
        };

        if (DB::transactionLevel() > 0) {
            DB::afterCommit($callback);
            return;
        }

        $callback();
    }
}
