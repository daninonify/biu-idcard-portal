<?php

namespace App\Providers;

use App\Models\User;
use App\Services\StudentDirectory\DatabaseDirectory;
use App\Services\StudentDirectory\DemoDirectory;
use App\Services\StudentDirectory\HttpDirectory;
use App\Services\StudentDirectory\StudentDirectory;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use InvalidArgumentException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(StudentDirectory::class, function () {
            $config = config('idcard.directory');

            return match ($config['driver']) {
                'database' => new DatabaseDirectory($config['database']),
                'http' => new HttpDirectory($config['http']),
                'demo' => new DemoDirectory,
                default => throw new InvalidArgumentException("Unknown STUDENT_DIRECTORY [{$config['driver']}]: use demo, database or http."),
            };
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        Gate::define('admin', fn (User $user) => $user->isAdmin());
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
