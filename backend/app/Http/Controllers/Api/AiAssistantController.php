<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiConversation;
use App\Services\AiBankingAssistantService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class AiAssistantController extends Controller
{
    public function __construct(private readonly AiBankingAssistantService $assistant)
    {
    }

    public function conversations(Request $request)
    {
        return ApiResponse::success('AI conversations retrieved successfully.', [
            'conversations' => $this->assistant->conversations($request->user()),
        ]);
    }

    public function show(Request $request, AiConversation $conversation)
    {
        $data = $this->assistant->conversation($request->user(), $conversation);

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

        $result = $this->assistant->answer(
            $request->user(),
            $data['message'],
            $data['conversation_id'] ?? null,
            $data['page_context'] ?? null
        );

        return ApiResponse::success('AI response generated successfully.', $result);
    }

    public function stream(Request $request)
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'min:1', 'max:2000'],
            'conversation_id' => ['nullable', 'integer'],
            'page_context' => ['nullable', 'string', 'max:120'],
        ]);

        $result = $this->assistant->answer(
            $request->user(),
            $data['message'],
            $data['conversation_id'] ?? null,
            $data['page_context'] ?? null
        );

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
}
