<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDaretRequest;
use App\Models\Daret;
use App\Services\DaretService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class DaretController extends Controller
{
    public function __construct(private readonly DaretService $daretService)
    {
    }

    public function store(StoreDaretRequest $request)
    {
        $daret = $this->daretService->create($request->user(), $request->validated());

        return ApiResponse::success('Daret created successfully.', [
            'daret' => $daret,
        ], 201);
    }

    public function join(Request $request, Daret $daret)
    {
        $daret = $this->daretService->join($daret, $request->user());

        return ApiResponse::success('Joined Daret successfully.', [
            'daret' => $daret,
        ]);
    }

    public function start(Request $request, Daret $daret)
    {
        $daret = $this->daretService->start($daret, $request->user());

        return ApiResponse::success('Daret started successfully.', [
            'daret' => $daret,
        ]);
    }

    public function pay(Request $request, Daret $daret)
    {
        $result = $this->daretService->pay($daret, $request->user());

        return ApiResponse::success('Daret contribution paid successfully.', $result);
    }
}
