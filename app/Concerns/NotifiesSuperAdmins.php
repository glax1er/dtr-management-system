<?php

namespace App\Concerns;

use App\Models\User;
use App\Notifications\CollegeAdminAccountNotification;
use Illuminate\Support\Facades\Notification;

/**
 * Shared helper used by AdminManagementController and CollegeAdminController
 * to dispatch CollegeAdminAccountNotification to all active Super Admins who
 * have opted into the `admin_management` preference.
 */
trait NotifiesSuperAdmins
{
    private function notifySuperAdminsOfAdminChange(
        string $event,
        User $targetAdmin,
        ?User $actor = null,
    ): void {
        $superAdmins = User::where('role', User::ROLE_SUPER_ADMIN)
            ->where('is_active', true)
            ->get()
            ->filter(fn (User $admin) => $admin->wantsNotification('admin_management'));

        if ($superAdmins->isNotEmpty()) {
            Notification::send($superAdmins, new CollegeAdminAccountNotification(
                event: $event,
                targetAdmin: $targetAdmin->loadMissing('college'),
                actor: $actor,
            ));
        }
    }
}
