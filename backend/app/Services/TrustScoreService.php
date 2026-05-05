<?php

namespace App\Services;

use App\Models\TrustScoreLog;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class TrustScoreService
{
    public const MIN_SCORE = 0;
    public const MAX_SCORE = 100;
    public const DEFAULT_SCORE = 50;

    public function __construct(private readonly NotificationService $notificationService)
    {
    }

    public function increase(User $user, int $points, string $reason, ?Model $related = null): TrustScoreLog
    {
        return $this->change($user, TrustScoreLog::TYPE_INCREASE, $points, $reason, $related);
    }

    public function decrease(User $user, int $points, string $reason, ?Model $related = null): TrustScoreLog
    {
        return $this->change($user, TrustScoreLog::TYPE_DECREASE, $points, $reason, $related);
    }

    public function recalculate(User $user): User
    {
        $oldScore = (int) $user->trust_score;
        $score = self::DEFAULT_SCORE;

        foreach ($user->trustScoreLogs()->oldest()->get() as $log) {
            $score = $log->change_type === TrustScoreLog::TYPE_INCREASE
                ? $this->clamp($score + $log->points)
                : $this->clamp($score - $log->points);
        }

        $user->update(['trust_score' => $score]);
        $this->syncOverdraftLimit($user);

        if ($oldScore !== $score) {
            $this->notificationService->createNotification(
                $user->id,
                'Trust Score Updated',
                "Your trust score is now {$score}",
                $score < $oldScore ? Notification::TYPE_WARNING : Notification::TYPE_INFO
            );
        }

        return $user->fresh();
    }

    public function canUseOverdraft(User $user): bool
    {
        $user = $user->fresh(['kycVerification']);

        return $user->isKycApproved() && (int) $user->trust_score >= 70;
    }

    public function canJoinDaret(User $user, float $contributionAmount): bool
    {
        $score = (int) $user->trust_score;

        if ($contributionAmount >= 1000) {
            return $score >= 70;
        }

        return $score >= 40;
    }

    public function level(User $user): string
    {
        return match (true) {
            $user->trust_score <= 39 => 'risky',
            $user->trust_score <= 69 => 'normal',
            $user->trust_score <= 89 => 'trusted',
            default => 'excellent',
        };
    }

    private function change(User $user, string $type, int $points, string $reason, ?Model $related = null): TrustScoreLog
    {
        $user->refresh();
        $oldScore = (int) $user->trust_score;
        $newScore = $type === TrustScoreLog::TYPE_INCREASE
            ? $this->clamp($oldScore + $points)
            : $this->clamp($oldScore - $points);

        $user->update(['trust_score' => $newScore]);

        $log = TrustScoreLog::create([
            'user_id' => $user->id,
            'change_type' => $type,
            'points' => $points,
            'old_score' => $oldScore,
            'new_score' => $newScore,
            'reason' => $reason,
            'related_type' => $related?->getMorphClass(),
            'related_id' => $related?->getKey(),
        ]);

        $this->syncOverdraftLimit($user);
        $this->notificationService->createNotification(
            $user->id,
            'Trust Score Updated',
            "Your trust score is now {$newScore}",
            $type === TrustScoreLog::TYPE_DECREASE ? Notification::TYPE_WARNING : Notification::TYPE_INFO
        );

        return $log;
    }

    private function clamp(int $score): int
    {
        return max(self::MIN_SCORE, min(self::MAX_SCORE, $score));
    }

    private function syncOverdraftLimit(User $user): void
    {
        $user = $user->fresh(['account', 'kycVerification']);

        if (! $user->account) {
            return;
        }

        $user->account->update([
            'overdraft_limit' => $this->canUseOverdraft($user) ? 500 : 0,
        ]);
    }
}
