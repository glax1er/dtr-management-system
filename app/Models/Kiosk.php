<?php
// app/Models/Kiosk.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Kiosk extends Model
{
    protected $fillable = [
        'name',
        'device_token',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public static function generateToken(): string
    {
        return Str::random(48);
    }
}