<?php

namespace App\Events;

class DepositConfirmed extends DepositCompleted
{
    public function broadcastAs(): string
    {
        return 'deposit.confirmed';
    }
}
