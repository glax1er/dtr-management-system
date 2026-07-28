<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InternProfile;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InternController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->input('status', 'pending');

        $interns = InternProfile::query()
            ->where('status', $status)
            ->with(['user:id,name,email', 'hte:hte_id,hte_name', 'program:program_id,program_name'])
            ->orderBy('registered_at', 'desc')
            ->get()
            ->map(fn (InternProfile $profile) => [
                'user_id' => $profile->user_id,
                'name' => $profile->user->name,
                'email' => $profile->user->email,
                'id_number' => $profile->id_number,
                'hte_name' => $profile->hte->hte_name,
                'program_name' => $profile->program->program_name,
                'status' => $profile->status,
                'registered_at' => $profile->registered_at->diffForHumans(),
            ]);

        return Inertia::render('admin/interns/index', [
            'interns' => $interns,
            'currentStatus' => $status,
        ]);
    }
}