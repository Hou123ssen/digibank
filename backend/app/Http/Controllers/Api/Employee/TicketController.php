<?php

namespace App\Http\Controllers\Api\Employee;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTicketMessageRequest;
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

    public function index()
    {
        $tickets = Ticket::query()
            ->with(['user:id,name,email', 'assignee:id,name,email'])
            ->latest()
            ->paginate(10);

        return ApiResponse::success('Tickets retrieved successfully.', [
            'tickets' => $tickets->items(),
            'pagination' => $this->pagination($tickets),
        ]);
    }

    public function assign(Request $request, Ticket $ticket)
    {
        $ticket = $this->ticketService->assign($ticket, $request->user());

        return ApiResponse::success('Ticket assigned successfully.', [
            'ticket' => $ticket,
        ]);
    }

    public function reply(StoreTicketMessageRequest $request, Ticket $ticket)
    {
        $message = $this->ticketService->employeeReply(
            $ticket,
            $request->user(),
            $request->validated('message')
        );

        return ApiResponse::success('Ticket reply sent successfully.', [
            'message' => $message,
        ], 201);
    }

    public function resolve(Ticket $ticket)
    {
        $ticket = $this->ticketService->resolve($ticket);

        return ApiResponse::success('Ticket resolved successfully.', [
            'ticket' => $ticket,
        ]);
    }

    public function close(Ticket $ticket)
    {
        $ticket = $this->ticketService->close($ticket);

        return ApiResponse::success('Ticket closed successfully.', [
            'ticket' => $ticket,
        ]);
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
