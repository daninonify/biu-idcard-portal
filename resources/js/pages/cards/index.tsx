import { Head, Link, router } from '@inertiajs/react';
import { ListChecks, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Pagination } from '@/components/portal/pagination';
import {
    EmptyState,
    PageHeader,
    StatusBadge,
    StudentAvatar,
    timeAgo,
} from '@/components/portal/ui';
import { cn } from '@/lib/utils';
import { index, show } from '@/routes/cards';
import type { CardRow, Paginated } from '@/types/portal';

type Filter = 'pending' | 'completed' | 'all';

type Props = {
    cards: Paginated<CardRow>;
    filters: { status: Filter; q: string; session: string };
    sessions: string[];
    totals: Record<Filter, number>;
};

const TABS: { key: Filter; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'completed', label: 'Completed' },
    { key: 'all', label: 'All' },
];

/** "Card processing status" from the legacy system, with live search. */
export default function CardsIndex({
    cards,
    filters,
    sessions,
    totals,
}: Props) {
    const [q, setQ] = useState(filters.q);
    const first = useRef(true);

    const go = (patch: Partial<Props['filters']>) =>
        router.get(
            index.url(),
            { ...filters, ...patch, q: patch.q ?? q },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    // search as you type
    useEffect(() => {
        if (first.current) {
            first.current = false;

            return;
        }
        const t = window.setTimeout(() => go({ q }), 300);

        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    return (
        <>
            <Head title="Card status" />
            <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
                <PageHeader
                    eyebrow="Card processing status"
                    title={`${totals[filters.status].toLocaleString()} ${filters.status === 'all' ? 'cards' : filters.status === 'pending' ? 'pending cards' : 'completed cards'}`}
                    description="Pending covers students still awaiting a photo and photos ready to print. Completed cards have been printed."
                    actions={
                        sessions.length > 0 && (
                            <select
                                value={filters.session}
                                onChange={(e) =>
                                    go({ session: e.target.value })
                                }
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
                                aria-label="Session"
                            >
                                {sessions.map((s) => (
                                    <option key={s} value={s}>
                                        Session {s}
                                    </option>
                                ))}
                                <option value="all">All sessions</option>
                            </select>
                        )
                    }
                />

                <div className="rounded-2xl border bg-card shadow-[0_1px_2px_rgba(20,24,70,0.04)]">
                    <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
                        <div className="inline-flex rounded-xl bg-muted p-1">
                            {TABS.map((t) => (
                                <button
                                    key={t.key}
                                    onClick={() => go({ status: t.key })}
                                    className={cn(
                                        'flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-all',
                                        filters.status === t.key
                                            ? 'bg-background text-navy-900 shadow-sm dark:text-white'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {t.label}
                                    <span
                                        className={cn(
                                            'rounded-full px-1.5 text-[11px] font-bold tabular-nums',
                                            filters.status === t.key
                                                ? 'bg-navy-100 text-navy-700 dark:bg-navy-700 dark:text-white'
                                                : 'bg-background/70',
                                        )}
                                    >
                                        {totals[t.key]}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className="relative md:w-96">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Search matric no, name, phone or email"
                                className="h-10 w-full rounded-xl border border-input bg-background pr-9 pl-9 text-sm outline-none focus:border-navy-400 focus:ring-4 focus:ring-navy-500/10"
                            />
                            {q && (
                                <button
                                    onClick={() => setQ('')}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                                    aria-label="Clear search"
                                >
                                    <X className="size-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {cards.data.length === 0 ? (
                        <EmptyState
                            icon={ListChecks}
                            title={
                                filters.q
                                    ? 'No matching students'
                                    : 'Nothing here yet'
                            }
                            description={
                                filters.q
                                    ? 'Try a different matric number or name.'
                                    : 'Look a student up to start their card.'
                            }
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                        <th className="px-5 py-3">Student</th>
                                        <th className="hidden px-3 py-3 md:table-cell">
                                            Phone
                                        </th>
                                        <th className="hidden px-3 py-3 lg:table-cell">
                                            Faculty / department
                                        </th>
                                        <th className="hidden px-3 py-3 sm:table-cell">
                                            Type
                                        </th>
                                        <th className="px-3 py-3">Status</th>
                                        <th className="hidden px-5 py-3 text-right xl:table-cell">
                                            Updated
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {cards.data.map((c) => (
                                        <tr
                                            key={c.id}
                                            onClick={() =>
                                                router.visit(show.url(c.id))
                                            }
                                            className="cursor-pointer transition-colors hover:bg-navy-50/50 dark:hover:bg-white/5"
                                        >
                                            <td className="px-5 py-3">
                                                <Link
                                                    href={show(c.id)}
                                                    className="flex items-center gap-3"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <StudentAvatar
                                                        src={c.thumb_url}
                                                        name={c.full_name}
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="truncate font-semibold text-navy-900 dark:text-white">
                                                            {c.full_name}
                                                        </div>
                                                        <div className="font-mono text-xs text-muted-foreground">
                                                            {c.matric_no}
                                                        </div>
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="hidden px-3 py-3 font-mono text-xs text-muted-foreground md:table-cell">
                                                {c.phone ?? '—'}
                                            </td>
                                            <td className="hidden max-w-64 px-3 py-3 lg:table-cell">
                                                <div className="truncate">
                                                    {c.department}
                                                </div>
                                                <div className="truncate text-xs text-muted-foreground">
                                                    {c.faculty}
                                                </div>
                                            </td>
                                            <td className="hidden px-3 py-3 sm:table-cell">
                                                <div>
                                                    {c.student_type_label ??
                                                        '—'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {c.template_label}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <StatusBadge
                                                    status={c.status}
                                                />
                                                {c.print_count > 1 && (
                                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                                        Printed {c.print_count}×
                                                    </div>
                                                )}
                                            </td>
                                            <td
                                                className="hidden px-5 py-3 text-right text-xs text-muted-foreground xl:table-cell"
                                                suppressHydrationWarning
                                            >
                                                {timeAgo(c.updated_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <Pagination page={cards} noun="cards" />
                </div>
            </div>
        </>
    );
}

CardsIndex.layout = {
    breadcrumbs: [{ title: 'Card status', href: index() }],
};
