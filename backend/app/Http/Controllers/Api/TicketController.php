<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTicketMessageRequest;
use App\Http\Requests\StoreTicketRequest;
use App\Models\Ticket;
use App\Services\TicketService;
use App\Support\ApiResponse;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;

class TicketController extends Controller
{
    public function __construct(private readonly TicketService $ticketService)
    {
    }

    public function store(StoreTicketRequest $request)
    {
        $ticket = $this->ticketService->create($request->user(), $request->validated());

        return ApiResponse::success('Ticket created successfully.', [
            'ticket' => $ticket,
        ], 201);
    }

    public function my(Request $request)
    {
        $tickets = $request->user()
            ->tickets()
            ->with(['assignee:id,name,email', 'messages.sender:id,name,email'])
            ->latest()
            ->paginate(10);

        return ApiResponse::success('Tickets retrieved successfully.', [
            'tickets' => $tickets->items(),
            'pagination' => $this->pagination($tickets),
        ]);
    }

    public function message(StoreTicketMessageRequest $request, Ticket $ticket)
    {
        $message = $this->ticketService->userMessage(
            $ticket,
            $request->user(),
            $request->validated('message')
        );

        return ApiResponse::success('Ticket message sent successfully.', [
            'message' => $message,
        ], 201);
    }

    private function pagination(LengthAwarePaginator $paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'last_page' => $paginator->lastPage(),
        ];
    }
}
