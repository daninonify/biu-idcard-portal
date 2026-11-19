import { Form, Head } from '@inertiajs/react';
import { LogIn } from 'lucide-react';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';

export default function Login({ status }: { status?: string }) {
    return (
        <>
            <Head title="Sign in" />

            {status && (
                <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                    {status}
                </div>
            )}

            {/* passkey button + "or continue with email" divider, above the form */}
            <PasskeyVerify />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Staff email</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="email"
                                placeholder="you@biu.edu.ng"
                                className="h-11 bg-white dark:bg-navy-950/40"
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                tabIndex={2}
                                autoComplete="current-password"
                                placeholder="••••••••"
                                className="h-11 bg-white dark:bg-navy-950/40"
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="flex items-center gap-3">
                            <Checkbox
                                id="remember"
                                name="remember"
                                tabIndex={3}
                            />
                            <Label
                                htmlFor="remember"
                                className="font-normal text-muted-foreground"
                            >
                                Keep me signed in on this computer
                            </Label>
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="mt-2 h-11 w-full text-[15px]"
                            tabIndex={4}
                            disabled={processing}
                            data-test="login-button"
                        >
                            {processing ? <Spinner /> : <LogIn />}
                            Sign in
                        </Button>
                    </>
                )}
            </Form>

            <p className="mt-8 text-center text-xs text-muted-foreground">
                Forgot your password or need an account? Ask the portal
                administrator.
            </p>
        </>
    );
}

Login.layout = {
    title: 'Welcome back',
    description: 'Sign in with your staff account to open the capture desk.',
};
