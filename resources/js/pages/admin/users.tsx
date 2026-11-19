import { Form, Head, usePage } from '@inertiajs/react';
import { KeyRound, PenLine, ShieldCheck, UserPlus } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { PageHeader, StudentAvatar, timeAgo } from '@/components/portal/ui';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { index, password, store, update } from '@/routes/admin/users';
import type { Option } from '@/types/portal';

type StaffUser = {
    id: number;
    name: string;
    email: string;
    role: string;
    role_label: string;
    is_active: boolean;
    two_factor: boolean;
    last_login_at: string | null;
    actions: number;
};

type Props = { users: StaffUser[]; roles: Option[] };

const control =
    'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs';

type Mode =
    | { kind: 'create' }
    | { kind: 'edit'; user: StaffUser }
    | { kind: 'password'; user: StaffUser }
    | null;

/** "User account": the few staff who can use the portal. */
export default function Users({ users, roles }: Props) {
    const { auth } = usePage().props;
    const [mode, setMode] = useState<Mode>(null);
    const close = () => setMode(null);

    return (
        <>
            <Head title="User accounts" />
            <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
                <PageHeader
                    eyebrow="Administration"
                    title="User accounts"
                    description="Only these staff can sign in. Deactivate an account instead of deleting it, so its history in Records stays attributed."
                    actions={
                        <Button onClick={() => setMode({ kind: 'create' })}>
                            <UserPlus /> Add staff member
                        </Button>
                    }
                />

                <div className="overflow-hidden rounded-2xl border bg-card">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/40 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                <th className="px-5 py-3">Staff member</th>
                                <th className="px-3 py-3">Role</th>
                                <th className="hidden px-3 py-3 md:table-cell">
                                    Last sign-in
                                </th>
                                <th className="hidden px-3 py-3 lg:table-cell">
                                    Actions logged
                                </th>
                                <th className="px-5 py-3 text-right" />
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {users.map((u) => (
                                <tr
                                    key={u.id}
                                    className={cn(!u.is_active && 'opacity-60')}
                                >
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <StudentAvatar
                                                name={u.name}
                                                className="rounded-full"
                                            />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 font-semibold text-navy-900 dark:text-white">
                                                    {u.name}
                                                    {u.id === auth.user.id && (
                                                        <span className="rounded bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
                                                            YOU
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="truncate text-xs text-muted-foreground">
                                                    {u.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span
                                                className={cn(
                                                    'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                                    u.role === 'admin'
                                                        ? 'bg-navy-900 text-gold-300'
                                                        : 'bg-muted text-muted-foreground',
                                                )}
                                            >
                                                {u.role_label}
                                            </span>
                                            {!u.is_active && (
                                                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                                                    Deactivated
                                                </span>
                                            )}
                                            {u.two_factor && (
                                                <span
                                                    title="Two-factor authentication on"
                                                    className="text-emerald-600"
                                                >
                                                    <ShieldCheck className="size-4" />
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td
                                        className="hidden px-3 py-3 text-muted-foreground md:table-cell"
                                        suppressHydrationWarning
                                    >
                                        {u.last_login_at
                                            ? timeAgo(u.last_login_at)
                                            : 'Never'}
                                    </td>
                                    <td className="hidden px-3 py-3 text-muted-foreground tabular-nums lg:table-cell">
                                        {u.actions}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setMode({
                                                        kind: 'edit',
                                                        user: u,
                                                    })
                                                }
                                            >
                                                <PenLine /> Edit
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setMode({
                                                        kind: 'password',
                                                        user: u,
                                                    })
                                                }
                                            >
                                                <KeyRound /> Password
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={mode !== null} onOpenChange={(o) => !o && close()}>
                <DialogContent>
                    {mode?.kind === 'create' && (
                        <Form
                            {...store.form()}
                            onSuccess={close}
                            className="space-y-4"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <DialogHeader>
                                        <DialogTitle>
                                            Add a staff member
                                        </DialogTitle>
                                        <DialogDescription>
                                            Give them the password in person;
                                            they can change it under Settings
                                            after signing in.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <UserFields roles={roles} errors={errors} />
                                    <PasswordFields errors={errors} />
                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={close}
                                        >
                                            Cancel
                                        </Button>
                                        <Button disabled={processing}>
                                            {processing && <Spinner />} Create
                                            account
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    )}

                    {mode?.kind === 'edit' && (
                        <Form
                            {...update.form(mode.user.id)}
                            onSuccess={close}
                            className="space-y-4"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <DialogHeader>
                                        <DialogTitle>
                                            Edit {mode.user.name}
                                        </DialogTitle>
                                    </DialogHeader>
                                    <UserFields
                                        roles={roles}
                                        errors={errors}
                                        user={mode.user}
                                    />
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="is_active">
                                            Access
                                        </Label>
                                        <select
                                            id="is_active"
                                            name="is_active"
                                            defaultValue={
                                                mode.user.is_active ? '1' : '0'
                                            }
                                            className={control}
                                        >
                                            <option value="1">
                                                Active — can sign in
                                            </option>
                                            <option value="0">
                                                Deactivated — signed out and
                                                blocked
                                            </option>
                                        </select>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={close}
                                        >
                                            Cancel
                                        </Button>
                                        <Button disabled={processing}>
                                            {processing && <Spinner />} Save
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    )}

                    {mode?.kind === 'password' && (
                        <Form
                            {...password.form(mode.user.id)}
                            onSuccess={close}
                            className="space-y-4"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <DialogHeader>
                                        <DialogTitle>
                                            Reset password for {mode.user.name}
                                        </DialogTitle>
                                        <DialogDescription>
                                            They will need the new password the
                                            next time they sign in.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <PasswordFields errors={errors} />
                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={close}
                                        >
                                            Cancel
                                        </Button>
                                        <Button disabled={processing}>
                                            {processing && <Spinner />} Reset
                                            password
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

function UserFields({
    roles,
    errors,
    user,
}: {
    roles: Option[];
    errors: Record<string, string | undefined>;
    user?: StaffUser;
}) {
    return (
        <div className="grid gap-4">
            <div className="grid gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                    id="name"
                    name="name"
                    defaultValue={user?.name}
                    required
                    autoFocus
                />
                <InputError message={errors.name} />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="email">Staff email</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={user?.email}
                    required
                />
                <InputError message={errors.email} />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="role">Role</Label>
                <select
                    id="role"
                    name="role"
                    defaultValue={user?.role ?? 'operator'}
                    className={control}
                >
                    {roles.map((r) => (
                        <option key={r.value} value={r.value}>
                            {r.label}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground">
                    Administrators can also manage accounts and portal settings,
                    and delete card records.
                </p>
                <InputError message={errors.role} />
            </div>
        </div>
    );
}

function PasswordFields({
    errors,
}: {
    errors: Record<string, string | undefined>;
}) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                    id="password"
                    name="password"
                    required
                    autoComplete="new-password"
                />
                <InputError message={errors.password} />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="password_confirmation">Confirm password</Label>
                <PasswordInput
                    id="password_confirmation"
                    name="password_confirmation"
                    required
                    autoComplete="new-password"
                />
            </div>
        </div>
    );
}

Users.layout = {
    breadcrumbs: [{ title: 'User accounts', href: index() }],
};
