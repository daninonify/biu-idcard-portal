import { Form, Head } from '@inertiajs/react';
import {
    CheckCircle2,
    Database,
    HardDrive,
    Save,
    Server,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { PageHeader, Panel } from '@/components/portal/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { edit, update } from '@/routes/admin/settings';

type Props = {
    settings: {
        session: string;
        valid_until: string;
        default_background: string;
        reprint_requires_reason: boolean;
        registrar_signature_url: string | null;
    };
    system: {
        directory: string;
        directory_driver: string;
        can_update_photo: boolean;
        rembg_url: string;
        rembg_running: boolean;
        photo_disk: string;
    };
};

function Status({ ok, label }: { ok: boolean; label: string }) {
    return (
        <span
            className={
                ok
                    ? 'inline-flex items-center gap-1 text-emerald-600'
                    : 'inline-flex items-center gap-1 text-red-600'
            }
        >
            {ok ? (
                <CheckCircle2 className="size-4" />
            ) : (
                <XCircle className="size-4" />
            )}{' '}
            {label}
        </span>
    );
}

export default function Settings({ settings, system }: Props) {
    const [bg, setBg] = useState(settings.default_background);
    const [preview, setPreview] = useState<string | null>(
        settings.registrar_signature_url,
    );

    return (
        <>
            <Head title="Portal settings" />
            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
                <PageHeader
                    eyebrow="Administration"
                    title="Portal settings"
                    description="Card details used for every new card, and the state of the connected services."
                />

                <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                    <Panel title="Cards">
                        <Form
                            {...update.form()}
                            options={{ preserveScroll: true }}
                            className="space-y-6"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="session">
                                                Current session
                                            </Label>
                                            <Input
                                                id="session"
                                                name="session"
                                                defaultValue={settings.session}
                                                placeholder="2026/2027"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                New lookups start a card for
                                                this session. Earlier cards are
                                                kept.
                                            </p>
                                            <InputError
                                                message={errors.session}
                                            />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="valid_until">
                                                Default "valid until"
                                            </Label>
                                            <Input
                                                id="valid_until"
                                                name="valid_until"
                                                defaultValue={
                                                    settings.valid_until
                                                }
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Used when the portal has no
                                                graduation year.
                                            </p>
                                            <InputError
                                                message={errors.valid_until}
                                            />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="default_background">
                                                Default photo background
                                            </Label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={bg}
                                                    onChange={(e) =>
                                                        setBg(e.target.value)
                                                    }
                                                    className="h-9 w-12 cursor-pointer rounded border"
                                                    aria-label="Pick colour"
                                                />
                                                <Input
                                                    id="default_background"
                                                    name="default_background"
                                                    value={bg}
                                                    onChange={(e) =>
                                                        setBg(e.target.value)
                                                    }
                                                    className="font-mono"
                                                />
                                            </div>
                                            <InputError
                                                message={
                                                    errors.default_background
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="reprint_requires_reason">
                                                Reprints
                                            </Label>
                                            <select
                                                id="reprint_requires_reason"
                                                name="reprint_requires_reason"
                                                defaultValue={
                                                    settings.reprint_requires_reason
                                                        ? '1'
                                                        : '0'
                                                }
                                                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
                                            >
                                                <option value="1">
                                                    Require a reason
                                                </option>
                                                <option value="0">
                                                    Reason optional
                                                </option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid gap-3">
                                        <Label>
                                            Registrar's signature (card back)
                                        </Label>
                                        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed p-4">
                                            <div className="grid h-20 w-48 place-items-center rounded-lg bg-[repeating-linear-gradient(45deg,#f4f4f6_0_6px,#fff_6px_12px)] ring-1 ring-black/5">
                                                {preview ? (
                                                    <img
                                                        src={preview}
                                                        alt="Registrar signature"
                                                        className="max-h-16 max-w-44 object-contain"
                                                    />
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">
                                                        No signature
                                                    </span>
                                                )}
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <input
                                                    type="file"
                                                    name="registrar_signature"
                                                    accept="image/png,image/jpeg,image/webp"
                                                    onChange={(e) => {
                                                        const f =
                                                            e.target.files?.[0];
                                                        setPreview(
                                                            f
                                                                ? URL.createObjectURL(
                                                                      f,
                                                                  )
                                                                : settings.registrar_signature_url,
                                                        );
                                                    }}
                                                    className="block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-navy-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    A transparent PNG of the
                                                    official signature works
                                                    best.
                                                </p>
                                                {settings.registrar_signature_url && (
                                                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <input
                                                            type="checkbox"
                                                            name="remove_signature"
                                                            value="1"
                                                        />{' '}
                                                        Remove the current
                                                        signature
                                                    </label>
                                                )}
                                                <InputError
                                                    message={
                                                        errors.registrar_signature
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <Button disabled={processing}>
                                            {processing ? (
                                                <Spinner />
                                            ) : (
                                                <Save />
                                            )}{' '}
                                            Save settings
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </Panel>

                    <div className="space-y-6">
                        <Panel title="Student portal">
                            <div className="space-y-3 text-sm">
                                <div className="flex items-start gap-3">
                                    <Database className="mt-0.5 size-4 shrink-0 text-navy-500" />
                                    <div>
                                        <div className="font-medium">
                                            {system.directory}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            STUDENT_DIRECTORY=
                                            {system.directory_driver}
                                        </div>
                                    </div>
                                </div>
                                <Status
                                    ok={system.can_update_photo}
                                    label={
                                        system.can_update_photo
                                            ? 'Can receive pictures'
                                            : 'Read only'
                                    }
                                />
                            </div>
                        </Panel>
                        <Panel title="Offline engine (rembg)">
                            <div className="space-y-3 text-sm">
                                <div className="flex items-start gap-3">
                                    <Server className="mt-0.5 size-4 shrink-0 text-navy-500" />
                                    <div className="font-mono text-xs">
                                        {system.rembg_url}
                                    </div>
                                </div>
                                <Status
                                    ok={system.rembg_running}
                                    label={
                                        system.rembg_running
                                            ? 'Running'
                                            : 'Not reachable — start it with: npm run rembg'
                                    }
                                />
                            </div>
                        </Panel>
                        <Panel title="Photo storage">
                            <div className="flex items-start gap-3 text-sm">
                                <HardDrive className="mt-0.5 size-4 shrink-0 text-navy-500" />
                                <div>
                                    Private disk{' '}
                                    <span className="font-mono">
                                        {system.photo_disk}
                                    </span>
                                    . Photos are only served to signed-in staff.
                                </div>
                            </div>
                        </Panel>
                    </div>
                </div>
            </div>
        </>
    );
}

Settings.layout = {
    breadcrumbs: [{ title: 'Portal settings', href: edit() }],
};
