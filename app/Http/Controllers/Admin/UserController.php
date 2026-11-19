<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\PasswordValidationRules;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\CardEvent;
use App\Models\User;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** "User account": administrators manage the few staff who use the portal. */
class UserController extends Controller
{
    use PasswordValidationRules;

    public function index(): Response
    {
        $activity = CardEvent::query()->selectRaw('user_id, count(*) as total')->groupBy('user_id')->pluck('total', 'user_id');

        return Inertia::render('admin/users', [
            'users' => User::query()->orderByDesc('is_active')->orderBy('name')->get()->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role->value,
                'role_label' => $u->role->label(),
                'is_active' => $u->is_active,
                'two_factor' => $u->two_factor_confirmed_at !== null,
                'last_login_at' => $u->last_login_at?->toIso8601String(),
                'actions' => (int) ($activity[$u->id] ?? 0),
            ]),
            'roles' => collect(Role::cases())->map(fn ($r) => ['value' => $r->value, 'label' => $r->label()]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique(User::class)],
            'role' => ['required', Rule::enum(Role::class)],
            'password' => $this->passwordRules(),
        ]);

        User::query()->create([...$data, 'email' => strtolower($data['email']), 'is_active' => true])
            ->forceFill(['email_verified_at' => now()])->save();

        Toast::success("Account created for {$data['name']}.");

        return back();
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique(User::class)->ignore($user)],
            'role' => ['required', Rule::enum(Role::class)],
            'is_active' => ['required', 'boolean'],
        ]);

        if ($user->is($request->user()) && ($data['role'] !== Role::Admin->value || ! $data['is_active'])) {
            return back()->withErrors(['role' => 'You cannot remove your own administrator access or deactivate yourself.']);
        }

        $user->update([...$data, 'email' => strtolower($data['email'])]);
        Toast::success('Account updated.');

        return back();
    }

    public function password(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate(['password' => $this->passwordRules()]);

        $user->forceFill(['password' => $data['password'], 'remember_token' => null])->save();
        Toast::success("Password reset for {$user->name}.");

        return back();
    }
}
