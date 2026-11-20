<?php

use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\CaptureController;
use App\Http\Controllers\CardController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\LookupController;
use App\Http\Controllers\PhotoController;
use App\Http\Controllers\PortalPictureController;
use App\Http\Controllers\PrintController;
use App\Http\Controllers\RecordController;
use App\Http\Controllers\RembgController;
use App\Http\Controllers\SignatureController;
use Illuminate\Support\Facades\Route;

// Staff-only portal: the home page is the dashboard (or the login screen).
Route::redirect('/', '/dashboard')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    // Welcome Centre Search
    Route::get('lookup', [LookupController::class, 'index'])->name('lookup');
    Route::post('lookup', [LookupController::class, 'store'])->middleware('throttle:60,1')->name('lookup.store');

    // Card processing status + the student's record
    Route::get('cards', [CardController::class, 'index'])->name('cards.index');
    Route::get('cards/{card}', [CardController::class, 'show'])->name('cards.show');
    Route::patch('cards/{card}', [CardController::class, 'update'])->name('cards.update');
    Route::post('cards/{card}/refresh', [CardController::class, 'refresh'])->name('cards.refresh');
    Route::delete('cards/{card}', [CardController::class, 'destroy'])->name('cards.destroy');

    // Capture studio
    Route::get('cards/{card}/capture', [CaptureController::class, 'show'])->name('cards.capture');
    Route::post('cards/{card}/photo', [CaptureController::class, 'store'])->name('cards.photo.store');
    Route::get('cards/{card}/photo', [PhotoController::class, 'show'])->name('cards.photo');
    Route::get('cards/{card}/photo/download', [PhotoController::class, 'download'])->name('cards.photo.download');

    // Holder signature (staff cards) and the registrar signatures from the old templates
    Route::get('cards/{card}/signature', [SignatureController::class, 'show'])->name('cards.signature');
    Route::post('cards/{card}/signature', [SignatureController::class, 'store'])->name('cards.signature.store');
    Route::delete('cards/{card}/signature', [SignatureController::class, 'destroy'])->name('cards.signature.destroy');
    Route::get('signatures/legacy/{variant}', [SignatureController::class, 'legacy'])->name('signatures.legacy');

    // Printing
    Route::get('cards/{card}/print', [PrintController::class, 'show'])->name('cards.print');
    Route::post('cards/{card}/printed', [PrintController::class, 'store'])->name('cards.printed');
    Route::post('cards/{card}/encoded', [PrintController::class, 'encode'])->name('cards.encoded');

    // Offline background removal (rembg on this server)
    Route::get('rembg/status', [RembgController::class, 'status'])->name('rembg.status');
    Route::post('rembg/remove', [RembgController::class, 'remove'])->middleware('throttle:30,1')->name('rembg.remove');

    // Records, data files, portal pictures, camera settings
    Route::get('records', [RecordController::class, 'index'])->name('records');
    // "exports" would clash with the CommonJS name in the generated TypeScript helpers
    Route::get('data-files', [ExportController::class, 'index'])->name('data-files');
    Route::get('data-files/download', [ExportController::class, 'download'])->middleware('throttle:20,1')->name('data-files.download');
    Route::get('portal-pictures', [PortalPictureController::class, 'index'])->name('portal-pictures');
    Route::post('portal-pictures', [PortalPictureController::class, 'store'])->name('portal-pictures.store');
    Route::inertia('camera-settings', 'camera-settings')->name('camera-settings');

    Route::get('settings/signature', [SettingController::class, 'signature'])->name('settings.signature');

    // Administrators only
    Route::middleware('can:admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::post('users', [UserController::class, 'store'])->name('users.store');
        Route::patch('users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::put('users/{user}/password', [UserController::class, 'password'])->name('users.password');

        Route::get('settings', [SettingController::class, 'edit'])->name('settings.edit');
        Route::post('settings', [SettingController::class, 'update'])->name('settings.update');
    });
});

require __DIR__.'/settings.php';
