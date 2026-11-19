import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import {
    Camera,
    Check,
    CloudUpload,
    Cpu,
    Download,
    History,
    MoreHorizontal,
    Printer,
    RefreshCw,
    Save,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { DEFAULT_ADJUST, ScaledCard, TEMPLATES } from '@/components/id-card';
import type { CardData } from '@/components/id-card';
import InputError from '@/components/input-error';
import {
    Panel,
    StatusBadge,
    StudentAvatar,
    formatDate,
    formatDateTime,
    timeAgo,
} from '@/components/portal/ui';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useCardPhoto } from '@/hooks/use-card-photo';
import { cn } from '@/lib/utils';
import {
    capture,
    destroy,
    encoded,
    index,
    print,
    refresh,
    show,
    update,
} from '@/routes/cards';
import { download } from '@/routes/cards/photo';
import { store as pushToPortal } from '@/routes/portal-pictures';
import type {
    CardDetail,
    EventRow,
    Option,
    StudentDetail,
} from '@/types/portal';

type Props = {
    card: CardDetail;
    student: StudentDetail;
    events: EventRow[];
    otherCards: CardDetail[];
    options: { studentTypes: Option[]; templates: Option[] };
    portal: { name: string; canUpdatePhoto: boolean };
};

function Field({
    label,
    value,
    mono,
    wide,
}: {
    label: string;
    value?: string | null;
    mono?: boolean;
    wide?: boolean;
}) {
    return (
        <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
            <dt className="text-xs font-medium text-muted-foreground">
                {label}
            </dt>
            <dd
                suppressHydrationWarning
                className={cn(
                    'mt-0.5 truncate text-sm font-medium text-navy-950 dark:text-white',
                    mono && 'font-mono',
                    !value && 'text-muted-foreground/60',
                )}
                title={value ?? ''}
            >
                {value || '—'}
            </dd>
        </div>
    );
}

function Steps({ card }: { card: CardDetail }) {
    const steps = [
        { label: 'Looked up', done: true, at: card.created_at },
        { label: 'Photo captured', done: card.has_photo, at: card.captured_at },
        { label: 'Printed', done: card.print_count > 0, at: card.printed_at },
        {
            label: 'Encoded',
            done: !!card.encoded_at,
            at: card.encoded_at,
            optional: true,
        },
    ];

    return (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {steps.map((s, i) => (
                <li key={s.label} className="flex items-center gap-3">
                    <span
                        className={cn(
                            'grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ring-4',
                            s.done
                                ? 'bg-emerald-500 text-white ring-emerald-500/15'
                                : 'bg-muted text-muted-foreground ring-transparent',
                        )}
                    >
                        {s.done ? <Check className="size-4" /> : i + 1}
                    </span>
                    <div className="min-w-0">
                        <div
                            className={cn(
                                'text-sm font-semibold',
                                s.done
                                    ? 'text-navy-900 dark:text-white'
                                    : 'text-muted-foreground',
                            )}
                        >
                            {s.label}
                            {s.optional && !s.done && (
                                <span className="ml-1 font-normal">
                                    (optional)
                                </span>
                            )}
                        </div>
                        <div
                            className="text-xs text-muted-foreground"
                            suppressHydrationWarning
                        >
                            {s.done && s.at ? formatDate(s.at) : 'Not yet'}
                        </div>
                    </div>
                </li>
            ))}
        </ol>
    );
}

export default function CardShow({
    card,
    student,
    events,
    otherCards,
    options,
    portal,
}: Props) {
    const { auth } = usePage().props;
    const photo = useCardPhoto(card);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const T = TEMPLATES[card.template];
    const data: CardData = {
        surname: student.surname,
        firstName: student.first_name,
        middleName: student.middle_name,
        department: student.department,
        faculty: student.faculty,
        matric: student.matric_no,
        programme: student.programme,
        validUntil: card.valid_until,
    };
    const adjust = card.framing ?? DEFAULT_ADJUST;

    return (
        <>
            <Head title={student.full_name} />
            <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
                {/* header */}
                <section className="overflow-hidden rounded-3xl border bg-card shadow-[0_1px_2px_rgba(20,24,70,0.04)]">
                    <div className="brand-wash flex flex-col gap-6 p-6 md:flex-row md:items-center md:p-8">
                        <StudentAvatar
                            src={card.photo_url}
                            name={student.full_name}
                            className="size-24 rounded-2xl text-2xl shadow-md ring-4 ring-white dark:ring-navy-900"
                        />
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={card.status} />
                                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                                    {card.template_label} card · {card.session}
                                </span>
                                {card.print_count > 1 && (
                                    <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-semibold text-gold-700">
                                        Printed {card.print_count}×
                                    </span>
                                )}
                            </div>
                            <h1 className="truncate text-2xl font-bold tracking-tight text-navy-900 md:text-3xl dark:text-white">
                                {student.full_name}
                            </h1>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <span className="font-mono font-semibold text-navy-700 dark:text-navy-200">
                                    {student.matric_no}
                                </span>
                                <span>{student.department}</span>
                                <span>{student.faculty}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                size="lg"
                                asChild
                                variant={card.has_photo ? 'outline' : 'default'}
                            >
                                <Link href={capture(card.id)}>
                                    <Camera />{' '}
                                    {card.has_photo
                                        ? 'Retake photo'
                                        : 'Capture photo'}
                                </Link>
                            </Button>
                            {card.has_photo && (
                                <Button
                                    size="lg"
                                    asChild
                                    className="bg-gold-400 text-navy-950 hover:bg-gold-300"
                                >
                                    <Link href={print(card.id)}>
                                        <Printer />{' '}
                                        {card.print_count
                                            ? 'Reprint'
                                            : 'Print card'}
                                    </Link>
                                </Button>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="size-10"
                                        aria-label="More actions"
                                    >
                                        <MoreHorizontal />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-60"
                                >
                                    <DropdownMenuItem
                                        onSelect={() =>
                                            router.post(
                                                refresh.url(card.id),
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        <RefreshCw /> Refresh from student
                                        portal
                                    </DropdownMenuItem>
                                    {card.has_photo && (
                                        <DropdownMenuItem asChild>
                                            <a href={download.url(card.id)}>
                                                <Download /> Download picture
                                                file
                                            </a>
                                        </DropdownMenuItem>
                                    )}
                                    {card.has_photo &&
                                        portal.canUpdatePhoto && (
                                            <DropdownMenuItem
                                                onSelect={() =>
                                                    router.post(
                                                        pushToPortal.url(),
                                                        { cards: [card.id] },
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    )
                                                }
                                            >
                                                <CloudUpload /> Update portal
                                                picture
                                            </DropdownMenuItem>
                                        )}
                                    {card.print_count > 0 &&
                                        !card.encoded_at && (
                                            <DropdownMenuItem
                                                onSelect={() =>
                                                    router.post(
                                                        encoded.url(card.id),
                                                        {},
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    )
                                                }
                                            >
                                                <Cpu /> Mark as encoded
                                            </DropdownMenuItem>
                                        )}
                                    {auth.user.is_admin && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onSelect={() =>
                                                    setConfirmDelete(true)
                                                }
                                            >
                                                <Trash2 /> Delete card record
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    <div className="border-t px-6 py-5 md:px-8">
                        <Steps card={card} />
                    </div>
                </section>

                <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
                    <div className="space-y-6">
                        <Panel
                            title="Student bio data"
                            description={`From ${portal.name}${student.portal_synced_at ? ` · synced ${timeAgo(student.portal_synced_at)}` : ''}`}
                            actions={
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        router.post(
                                            refresh.url(card.id),
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    <RefreshCw /> Refresh
                                </Button>
                            }
                        >
                            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                                <Field
                                    label="Surname"
                                    value={student.surname}
                                />
                                <Field
                                    label="First name"
                                    value={student.first_name}
                                />
                                <Field
                                    label="Middle name"
                                    value={student.middle_name}
                                />
                                <Field
                                    label="Faculty"
                                    value={student.faculty}
                                    wide
                                />
                                <Field
                                    label="Department"
                                    value={student.department}
                                />
                                <Field
                                    label="Programme"
                                    value={student.programme}
                                />
                                <Field label="Level" value={student.level} />
                                <Field label="Sex" value={student.sex} />
                                <Field
                                    label="Date of birth"
                                    value={
                                        student.date_of_birth
                                            ? formatDate(student.date_of_birth)
                                            : null
                                    }
                                />
                                <Field
                                    label="Phone"
                                    value={student.phone}
                                    mono
                                />
                                <Field
                                    label="Email"
                                    value={student.email}
                                    wide
                                />
                                <Field
                                    label="Country"
                                    value={student.country}
                                />
                                <Field label="State" value={student.state} />
                                <Field label="LGA" value={student.lga} />
                                <Field
                                    label="Contact address"
                                    value={student.address}
                                    wide
                                />
                            </dl>
                        </Panel>

                        <Panel
                            title="Card details"
                            description="Correct these here if the portal is wrong. Bio data above is changed on the student portal."
                        >
                            <Form
                                {...update.form(card.id)}
                                options={{ preserveScroll: true }}
                                className="space-y-6"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <div className="grid gap-6 md:grid-cols-2">
                                            <fieldset className="space-y-2">
                                                <legend className="text-sm font-medium">
                                                    Student type
                                                </legend>
                                                <div className="flex flex-wrap gap-2">
                                                    {options.studentTypes.map(
                                                        (o) => (
                                                            <label
                                                                key={o.value}
                                                                className="cursor-pointer"
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name="student_type"
                                                                    value={
                                                                        o.value
                                                                    }
                                                                    defaultChecked={
                                                                        student.student_type ===
                                                                        o.value
                                                                    }
                                                                    className="peer sr-only"
                                                                />
                                                                <span className="inline-flex rounded-lg border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all peer-checked:border-navy-500 peer-checked:bg-navy-50 peer-checked:text-navy-800 peer-focus-visible:ring-2 peer-focus-visible:ring-ring dark:peer-checked:bg-navy-800 dark:peer-checked:text-white">
                                                                    {o.label}
                                                                </span>
                                                            </label>
                                                        ),
                                                    )}
                                                </div>
                                                <InputError
                                                    message={
                                                        errors.student_type
                                                    }
                                                />
                                            </fieldset>
                                            <fieldset className="space-y-2">
                                                <legend className="text-sm font-medium">
                                                    Card design
                                                </legend>
                                                <div className="flex flex-wrap gap-2">
                                                    {options.templates.map(
                                                        (o) => (
                                                            <label
                                                                key={o.value}
                                                                className="cursor-pointer"
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name="template"
                                                                    value={
                                                                        o.value
                                                                    }
                                                                    defaultChecked={
                                                                        card.template ===
                                                                        o.value
                                                                    }
                                                                    className="peer sr-only"
                                                                />
                                                                <span className="inline-flex rounded-lg border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all peer-checked:border-navy-500 peer-checked:bg-navy-50 peer-checked:text-navy-800 peer-focus-visible:ring-2 peer-focus-visible:ring-ring dark:peer-checked:bg-navy-800 dark:peer-checked:text-white">
                                                                    {o.label}
                                                                </span>
                                                            </label>
                                                        ),
                                                    )}
                                                </div>
                                                <InputError
                                                    message={errors.template}
                                                />
                                            </fieldset>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="valid_until">
                                                    Valid until
                                                </Label>
                                                <Input
                                                    id="valid_until"
                                                    name="valid_until"
                                                    defaultValue={
                                                        card.valid_until ?? ''
                                                    }
                                                />
                                                <InputError
                                                    message={errors.valid_until}
                                                />
                                            </div>
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="graduation_year">
                                                    Graduation year
                                                </Label>
                                                <Input
                                                    id="graduation_year"
                                                    name="graduation_year"
                                                    defaultValue={
                                                        student.graduation_year ??
                                                        ''
                                                    }
                                                />
                                            </div>
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="guardian_phone">
                                                    Guardian phone
                                                </Label>
                                                <Input
                                                    id="guardian_phone"
                                                    name="guardian_phone"
                                                    defaultValue={
                                                        student.guardian_phone ??
                                                        ''
                                                    }
                                                />
                                            </div>
                                            <div className="grid gap-1.5 md:col-span-1">
                                                <Label htmlFor="guardian_name">
                                                    Name of guardian
                                                </Label>
                                                <Input
                                                    id="guardian_name"
                                                    name="guardian_name"
                                                    defaultValue={
                                                        student.guardian_name ??
                                                        ''
                                                    }
                                                />
                                            </div>
                                            <div className="grid gap-1.5 md:col-span-2">
                                                <Label htmlFor="guardian_address">
                                                    Guardian address
                                                </Label>
                                                <Input
                                                    id="guardian_address"
                                                    name="guardian_address"
                                                    defaultValue={
                                                        student.guardian_address ??
                                                        ''
                                                    }
                                                />
                                            </div>
                                            <div className="grid gap-1.5 md:col-span-3">
                                                <Label htmlFor="notes">
                                                    Notes
                                                </Label>
                                                <textarea
                                                    id="notes"
                                                    name="notes"
                                                    rows={2}
                                                    defaultValue={
                                                        card.notes ?? ''
                                                    }
                                                    placeholder="Anything the next operator should know"
                                                    className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <Button disabled={processing}>
                                                {processing ? (
                                                    <Spinner />
                                                ) : (
                                                    <Save />
                                                )}{' '}
                                                Save details
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </Form>
                        </Panel>
                    </div>

                    <div className="space-y-6">
                        <Panel
                            title="Card preview"
                            bodyClassName="flex justify-center gap-4 bg-muted/40 rounded-b-2xl py-6"
                        >
                            <div className="flex flex-col items-center gap-2">
                                <ScaledCard scale={0.31}>
                                    <T.Front
                                        data={data}
                                        photo={photo}
                                        adjust={adjust}
                                    />
                                </ScaledCard>
                                <span className="text-xs font-medium text-muted-foreground">
                                    Front
                                </span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <ScaledCard scale={0.31}>
                                    <T.Back
                                        data={data}
                                        photo={photo}
                                        adjust={adjust}
                                    />
                                </ScaledCard>
                                <span className="text-xs font-medium text-muted-foreground">
                                    Back
                                </span>
                            </div>
                        </Panel>

                        {card.has_photo && (
                            <Panel title="Photo">
                                <dl className="grid grid-cols-2 gap-4">
                                    <Field
                                        label="Engine"
                                        value={card.photo_engine_label}
                                    />
                                    <Field
                                        label="Captured by"
                                        value={card.captured_by}
                                    />
                                    <Field
                                        label="Captured"
                                        value={formatDateTime(card.captured_at)}
                                        wide
                                    />
                                    <Field
                                        label="Student portal"
                                        value={
                                            card.portal_photo_synced_at
                                                ? `Updated ${timeAgo(card.portal_photo_synced_at)}`
                                                : 'Not sent yet'
                                        }
                                        wide
                                    />
                                </dl>
                            </Panel>
                        )}

                        <Panel title="History" bodyClassName="px-5 py-4">
                            {events.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No history yet.
                                </p>
                            ) : (
                                <ol className="relative space-y-4 border-l border-dashed pl-5">
                                    {events.map((e) => (
                                        <li key={e.id} className="relative">
                                            <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-background bg-navy-400" />
                                            <div className="text-sm font-medium text-navy-900 dark:text-white">
                                                {e.description}
                                            </div>
                                            <div
                                                className="text-xs text-muted-foreground"
                                                suppressHydrationWarning
                                            >
                                                {e.user ?? 'System'} ·{' '}
                                                {formatDateTime(e.created_at)}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </Panel>

                        {otherCards.length > 0 && (
                            <Panel title="Earlier sessions" bodyClassName="p-0">
                                <ul className="divide-y">
                                    {otherCards.map((c) => (
                                        <li key={c.id}>
                                            <Link
                                                href={show(c.id)}
                                                className="flex items-center justify-between px-5 py-3 text-sm hover:bg-muted/50"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <History className="size-4 text-muted-foreground" />{' '}
                                                    Session {c.session}
                                                </span>
                                                <StatusBadge
                                                    status={c.status}
                                                />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </Panel>
                        )}
                    </div>
                </div>
            </div>

            <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete this card record?</DialogTitle>
                        <DialogDescription>
                            The photo and card for {student.full_name} (
                            {card.session}) are removed. The history in Records
                            is kept. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={() => router.delete(destroy.url(card.id))}
                        >
                            <Trash2 /> Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

CardShow.layout = {
    breadcrumbs: [
        { title: 'Card status', href: index() },
        { title: 'Student record', href: '#' },
    ],
};
