<?php

namespace App\Http\Controllers\Intern;

use App\Http\Controllers\Controller;
use App\Http\Requests\Intern\UpdateProfilePhotoRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfilePhotoController extends Controller
{
    public function store(UpdateProfilePhotoRequest $request): RedirectResponse
    {
        $profile = $request->user()->internProfile()->firstOrFail();

        // Delete the old file first, if one exists — an intern only ever
        // has exactly one photo stored, never an accumulating history.
        if ($profile->profile_photo_path) {
            Storage::disk('public')->delete($profile->profile_photo_path);
        }

        $path = $request->file('photo')->store('intern-photos', 'public');

        $profile->update(['profile_photo_path' => $path]);

        return back()->with('success', 'Profile photo updated.');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $profile = $request->user()->internProfile()->firstOrFail();

        if ($profile->profile_photo_path) {
            Storage::disk('public')->delete($profile->profile_photo_path);
            $profile->update(['profile_photo_path' => null]);
        }

        return back()->with('success', 'Profile photo removed.');
    }
}
