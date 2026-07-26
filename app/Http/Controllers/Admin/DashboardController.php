<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InternProfile;
use App\Models\Hte;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $recentRegistrations = InternProfile::query()
            ->with(['user:id,name', 'hte:hte_id,hte_name', 'program:program_id,program_name'])
            ->orderBy('registered_at', 'desc')
            ->limit(8)
            ->get()
            ->map(fn (InternProfile $profile) => [
                'user_id' => $profile->user_id,
                'name' => $profile->user->name,
                'hte_name' => $profile->hte->hte_name,
                'program_name' => $profile->program->program_name,
                'status' => $profile->status,
                'registered_at' => $profile->registered_at->diffForHumans(),
            ]);

        return Inertia::render('admin/dashboard', [
            'pendingApprovals' => InternProfile::where('status', 'pending')->count(),
            'totalInterns' => InternProfile::where('status', 'approved')->count(),
            'totalSupervisors' => User::where('role', User::ROLE_SUPERVISOR)->count(),
            'activeHtes' => Hte::where('status', 'active')->count(),
            'recentRegistrations' => $recentRegistrations,
        ]);
    }
}