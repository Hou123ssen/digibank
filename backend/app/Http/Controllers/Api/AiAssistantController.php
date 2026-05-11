<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiConversation;
use App\Services\AiBankingAssistantService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class AiAssistantController extends Controller
{
    public function __construct(private readonly AiBankingAssistantService $assistant)
    {
    }

    public function conversations(Request $request)
    {
        try {
            return ApiResponse::success('AI conversations retrieved successfully.', [
                'conversations' => $this->assistant->conversations($request->user()),
            ]);
        } catch (Throwable $exception) {
            return $this->aiError($exception, 'Unable to load AI conversations.');
        }
    }

    public function show(Request $request, AiConversation $conversation)
    {
        try {
            $data = $this->assistant->conversation($request->user(), $conversation);
        } catch (Throwable $exception) {
            return $this->aiError($exception, 'Unable to load AI conversation.');
        }

        if (! $data) {
            return ApiResponse::error('Conversation not found.', [], 404);
        }

        return ApiResponse::success('AI conversation retrieved successfully.', [
            'conversation' => $data,
        ]);
    }

    public function chat(Request $request)
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'min:1', 'max:2000'],
            'conversation_id' => ['nullable', 'integer'],
            'page_context' => ['nullable', 'string', 'max:120'],
        ]);

        try {
            $result = $this->assistant->answer(
                $request->user(),
                $data['message'],
                $data['conversation_id'] ?? null,
                $data['page_context'] ?? null
            );
        } catch (Throwable $exception) {
            return $this->aiError($exception, 'DigiBank AI is temporarily unavailable. Please try again later.');
        }

        return ApiResponse::success('AI response generated successfully.', $result);
    }

    public function stream(Request $request)
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'min:1', 'max:2000'],
            'conversation_id' => ['nullable', 'integer'],
            'page_context' => ['nullable', 'string', 'max:120'],
        ]);

        try {
            $result = $this->assistant->answer(
                $request->user(),
                $data['message'],
                $data['conversation_id'] ?? null,
                $data['page_context'] ?? null
            );
        } catch (Throwable $exception) {
            Log::error('AI stream request failed.', [
                'user_id' => $request->user()?->id,
                'exception' => $exception,
            ]);

            return response()->json([
                'success' => false,
                'error' => 'ai_unavailable',
                'message' => 'DigiBank AI is temporarily unavailable. Please try again later.',
            ], 503);
        }

        return response()->stream(function () use ($result): void {
            foreach (str_split($result['message']['content'], 28) as $chunk) {
                echo 'data: ' . json_encode(['delta' => $chunk]) . "\n\n";
                @ob_flush();
                flush();
                usleep(18000);
            }

            echo 'data: ' . json_encode([
                'done' => true,
                'conversation' => $result['conversation'],
                'message' => $result['message'],
                'context_sources' => $result['context_sources'],
            ]) . "\n\n";
            @ob_flush();
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-transform',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    private function aiError(Throwable $exception, string $message)
    {
        Log::error('AI assistant request failed.', [
            'exception' => $exception,
        ]);

        return response()->json([
            'success' => false,
            'error' => 'ai_unavailable',
            'message' => $message,
        ], 503);
    }
}
