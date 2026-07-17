<?php
// app/Http/Controllers/Admin/DashboardController.php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InternProfile;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $pendingInterns = InternProfile::query()
            ->where('status', 'pending')
            ->with(['user:id,name,email', 'hte:hte_id,hte_name', 'program:program_id,program_name'])
            ->orderBy('registered_at')
            ->get()
            ->map(fn (InternProfile $profile) => [
                'user_id' => $profile->user_id,
                'name' => $profile->user->name,
                'email' => $profile->user->email,
                'id_number' => $profile->id_number,
                'hte_name' => $profile->hte->hte_name,
                'program_name' => $profile->program->program_name,
                'registered_at' => $profile->registered_at->diffForHumans(),
            ]);
        
        return Inertia::render('admin/dashboard', [
            'pendingApprovals' => $pendingInterns->count(),
            'totalInterns' => InternProfile::where('status', 'approved')->count(),
            'totalSupervisors' => User::where('role', User::ROLE_SUPERVISOR)->count(),
            'activePrograms' => \App\Models\Program::where('is_active', true)->count(),
            'pendingInterns' => $pendingInterns,
        ]);
    }
}