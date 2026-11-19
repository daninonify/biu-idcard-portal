<?php

namespace App\Support;

use Inertia\Inertia;

/** Shows a toast on the next page (the starter kit's sonner + useFlashToast). */
final class Toast
{
    public static function success(string $message): void
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);
    }

    public static function error(string $message): void
    {
        Inertia::flash('toast', ['type' => 'error', 'message' => $message]);
    }

    public static function info(string $message): void
    {
        Inertia::flash('toast', ['type' => 'info', 'message' => $message]);
    }
}
