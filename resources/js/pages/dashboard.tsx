import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Camera,
    CheckCircle2,
    Clock3,
    Printer,
    RotateCcw,
    Sparkles,
} from 'lucide-react';
import { MatricSearch } from '@/components/portal/matric-search';
import {
    EmptyState,
    Panel,
    StatCard,
    StudentAvatar,
    timeAgo,
} from '@/components/portal/ui';
import { Button } from '@/components/ui/button';
import { dashboard, records } from '@/routes';
import { index as cardsIndex, print, show } from '@/routes/cards';
import type { CardRow, EventRow } from '@/types/portal';

type Props = {
    session: string;
    stats: {
        pending: number;
        captured: number;
        printed: number;
        printed_today: number;
        captured_today: number;
        reprints: number;
    };
    trend: { date: string; label: string; printed: number }[];
    queue: CardRow[];
    activity: EventRow[];
    directory: string;
    demoMatrics: string[];
};

function greeting(): string {
    const h = new Date().getHours();

    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard({
    session,
    stats,
    trend,
    queue,
    activity,
    directory,
    demoMatrics,
}: Props) {
    const { auth } = usePage().props;
    const total = stats.pending + stats.captured + stats.printed;
    const done = total ? Math.round((stats.printed / total) * 100) : 0;
    const max = Math.max(1, ...trend.map((t) => t.printed));

    return (
        <>
            <Head title="Dashboard" />
            <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
                {/* hero */}
                <section className="brand-pattern relative overflow-hidden rounded-3xl bg-navy-900 px-6 py-8 text-white shadow-[0_20px_50px_-20px_rgba(30,35,100,0.6)] md:px-10 md:py-10">
                    <div className="absolute -top-24 -right-16 size-80 rounded-full bg-gold-400/25 blur-3xl" />
                    <div className="absolute -bottom-32 left-1/3 size-80 rounded-full bg-navy-500/40 blur-3xl" />
                    <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
                        <div className="max-w-2xl space-y-5">
                            <div>
                                <div
                                    className="text-sm font-medium text-gold-300"
                                    suppressHydrationWarning
                                >
                                    {greeting()}, {auth.user.name.split(' ')[0]}{' '}
                                    · Session {session}
                                </div>
                                <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
                                    Who's next at the desk?
                                </h1>
                            </div>
                            <div className="rounded-2xl bg-white/95 p-2 text-foreground shadow-lg dark:bg-navy-950/80">
                                <MatricSearch
                                    size="lg"
                                    autoFocus
                                    hints={demoMatrics.slice(0, 4)}
                                />
                            </div>
                            {demoMatrics.length > 0 && (
                                <div className="flex items-center gap-1.5 text-xs text-white/60">
                                    <Sparkles className="size-3.5 text-gold-300" />{' '}
                                    Using fictional demo students until the
                                    student portal is connected.
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                            <div className="relative size-24">
                                <svg
                                    viewBox="0 0 36 36"
                                    className="size-24 -rotate-90"
                                >
                                    <circle
                                        cx="18"
                                        cy="18"
                                        r="15.5"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.12)"
                                        strokeWidth="3.5"
                                    />
                                    <circle
                                        cx="18"
                                        cy="18"
                                        r="15.5"
                                        fill="none"
                                        stroke="oklch(0.8 0.16 80)"
                                        strokeWidth="3.5"
                                        strokeLinecap="round"
                                        strokeDasharray={`${(done / 100) * 97.4} 97.4`}
                                    />
                                </svg>
                                <div className="absolute inset-0 grid place-items-center text-xl font-bold">
                                    {done}%
                                </div>
                            </div>
                            <div className="text-sm">
                                <div className="font-semibold">
                                    Session progress
                                </div>
                                <div className="mt-1 text-white/60">
                                    {stats.printed} of {total} cards printed
                                </div>
                                <div className="mt-0.5 text-white/60">
                                    {stats.reprints} reprinted
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* KPIs */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Awaiting photo"
                        value={stats.pending}
                        icon={Clock3}
                        tone="gold"
                        hint="Looked up, no photo yet"
                    />
                    <StatCard
                        label="Ready to print"
                        value={stats.captured}
                        icon={Camera}
                        tone="navy"
                        hint={`${stats.captured_today} ${stats.captured_today === 1 ? 'photo' : 'photos'} taken today`}
                    />
                    <StatCard
                        label="Printed today"
                        value={stats.printed_today}
                        icon={Printer}
                        tone="green"
                        hint="Including reprints"
                    />
                    <StatCard
                        label="Completed this session"
                        value={stats.printed}
                        icon={CheckCircle2}
                        tone="slate"
                        hint={`Session ${session}`}
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                    {/* trend */}
                    <Panel
                        title="Cards printed"
                        description="Last 14 days"
                        className="flex flex-col"
                        bodyClassName="flex flex-1 flex-col pt-6"
                    >
                        <div className="flex min-h-48 flex-1 items-end gap-1.5 sm:gap-2.5">
                            {trend.map((t, i) => (
                                <div
                                    key={t.date}
                                    className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                                >
                                    <div className="relative flex w-full flex-1 items-end">
                                        <div
                                            className={
                                                'w-full rounded-t-md transition-colors ' +
                                                (i === trend.length - 1
                                                    ? 'bg-gold-400'
                                                    : 'bg-navy-200 group-hover:bg-navy-400 dark:bg-navy-700 dark:group-hover:bg-navy-500')
                                            }
                                            style={{
                                                height: `${Math.max(3, (t.printed / max) * 100)}%`,
                                            }}
                                        />
                                        <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-navy-900 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                                            {t.printed}
                                        </span>
                                    </div>
                                    <span className="text-[10px] whitespace-nowrap text-muted-foreground">
                                        {i % 2 === trend.length % 2
                                            ? t.label
                                            : ''}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Panel>

                    {/* ready to print */}
                    <Panel
                        title="Ready to print"
                        description="Oldest first"
                        bodyClassName="p-0"
                        actions={
                            <Button variant="ghost" size="sm" asChild>
                                <Link
                                    href={cardsIndex({
                                        query: { status: 'pending' },
                                    })}
                                >
                                    All <ArrowRight />
                                </Link>
                            </Button>
                        }
                    >
                        {queue.length === 0 ? (
                            <EmptyState
                                icon={Printer}
                                title="Nothing waiting"
                                description="Captured photos appear here until the card is printed."
                            />
                        ) : (
                            <ul className="divide-y">
                                {queue.map((c) => (
                                    <li
                                        key={c.id}
                                        className="flex items-center gap-3 px-5 py-3"
                                    >
                                        <StudentAvatar
                                            src={c.thumb_url}
                                            name={c.full_name}
                                        />
                                        <Link
                                            href={show(c.id)}
                                            className="min-w-0 flex-1"
                                        >
                                            <div className="truncate font-medium text-navy-900 dark:text-white">
                                                {c.full_name}
                                            </div>
                                            <div className="truncate font-mono text-xs text-muted-foreground">
                                                {c.matric_no}
                                            </div>
                                        </Link>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            asChild
                                        >
                                            <Link href={print(c.id)}>
                                                <Printer /> Print
                                            </Link>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </div>

                {/* activity */}
                <Panel
                    title="Recent activity"
                    bodyClassName="p-0"
                    actions={
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={records()}>
                                Records <ArrowRight />
                            </Link>
                        </Button>
                    }
                >
                    {activity.length === 0 ? (
                        <EmptyState icon={RotateCcw} title="No activity yet" />
                    ) : (
                        <ul className="divide-y">
                            {activity.map((e) => (
                                <li
                                    key={e.id}
                                    className="flex items-center gap-4 px-5 py-3 text-sm"
                                >
                                    <span className="size-2 shrink-0 rounded-full bg-gold-400" />
                                    <div className="min-w-0 flex-1">
                                        <span className="font-medium text-navy-900 dark:text-white">
                                            {e.description}
                                        </span>
                                        {e.student_name && (
                                            <>
                                                {' '}
                                                <span className="text-muted-foreground">
                                                    ·
                                                </span>{' '}
                                                {e.card_id ? (
                                                    <Link
                                                        href={show(e.card_id)}
                                                        className="hover:underline"
                                                    >
                                                        {e.student_name}
                                                    </Link>
                                                ) : (
                                                    e.student_name
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <div className="hidden text-muted-foreground sm:block">
                                        {e.user}
                                    </div>
                                    <div
                                        className="w-28 shrink-0 text-right text-xs text-muted-foreground"
                                        suppressHydrationWarning
                                    >
                                        {timeAgo(e.created_at)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>

                <p className="text-center text-xs text-muted-foreground">
                    Student records from: {directory}
                </p>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
