<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->get();

        return ApiResponse::success('Notifications retrieved successfully.', [
            'notifications' => $notifications,
        ]);
    }

    public function markAsRead(Request $request, Notification $notification)
    {
        if ($notification->user_id !== $request->user()->id) {
            return ApiResponse::error('Notification not found.', [], 404);
        }

        $notification->update(['is_read' => true]);

        return ApiResponse::success('Notification marked as read.', [
            'notification' => $notification->fresh(),
        ]);
    }
}
