import { Head, Link, router } from '@inertiajs/react';
import {
    Camera,
    Cpu,
    Download,
    FileSpreadsheet,
    History,
    ImageUp,
    PenLine,
    Printer,
    RefreshCw,
    Search,
    SquarePlus,
    Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Pagination } from '@/components/portal/pagination';
import {
    CategoryBadge,
    EmptyState,
    PageHeader,
    formatDateTime,
} from '@/components/portal/ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { records } from '@/routes';
import { show } from '@/routes/cards';
import type { EventRow, Option, Paginated } from '@/types/portal';

type Filters = {
    q: string;
    category: string;
    action: string;
    user: string;
    from: string;
    to: string;
};

type Props = {
    events: Paginated<EventRow>;
    filters: Filters;
    actions: Option[];
    categories: Option[];
    users: { id: number; name: string }[];
};

const ICONS: Record<string, [LucideIcon, string]> = {
    card_created: [
        SquarePlus,
        'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
    ],
    photo_captured: [
        Camera,
        'bg-navy-50 text-navy-600 dark:bg-navy-400/15 dark:text-navy-200',
    ],
    photo_replaced: [
        Camera,
        'bg-navy-50 text-navy-600 dark:bg-navy-400/15 dark:text-navy-200',
    ],
    card_printed: [
        Printer,
        'bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
    ],
    card_reprinted: [
        Printer,
        'bg-gold-50 text-gold-700 dark:bg-gold-400/15 dark:text-gold-300',
    ],
    card_encoded: [
        Cpu,
        'bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
    ],
    details_updated: [
        PenLine,
        'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
    ],
    portal_refreshed: [
        RefreshCw,
        'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
    ],
    portal_photo_updated: [
        ImageUp,
        'bg-navy-50 text-navy-600 dark:bg-navy-400/15 dark:text-navy-200',
    ],
    photo_downloaded: [
        Download,
        'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
    ],
    data_exported: [
        FileSpreadsheet,
        'bg-gold-50 text-gold-700 dark:bg-gold-400/15 dark:text-gold-300',
    ],
    card_deleted: [
        Trash2,
        'bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-300',
    ],
};

const control =
    'h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

/** "Records": every action taken in the portal, for accountability. */
export default function Records({
    events,
    filters,
    actions,
    categories,
    users,
}: Props) {
    const [f, setF] = useState<Filters>(filters);

    const apply = (next: Filters) => {
        setF(next);
        router.get(
            records.url(),
            Object.fromEntries(
                Object.entries(next).filter(([, v]) => v !== ''),
            ),
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    return (
        <>
            <Head title="Records" />
            <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
                <PageHeader
                    eyebrow="Audit trail"
                    title="Records"
                    description="Everything done in the portal, by whom and when. Entries cannot be edited or removed."
                />

                <div className="rounded-2xl border bg-card shadow-[0_1px_2px_rgba(20,24,70,0.04)]">
                    <form
                        className="grid gap-3 border-b p-4 md:grid-cols-[1fr_auto_auto_auto_auto_auto_auto]"
                        onSubmit={(e) => {
                            e.preventDefault();
                            apply(f);
                        }}
                    >
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={f.q}
                                onChange={(e) =>
                                    setF({ ...f, q: e.target.value })
                                }
                                placeholder="Matric / staff no, name or description"
                                className={cn(control, 'w-full pl-9')}
                            />
                        </div>
                        <select
                            value={f.category}
                            onChange={(e) =>
                                apply({ ...f, category: e.target.value })
                            }
                            className={control}
                            aria-label="Category"
                        >
                            <option value="">All categories</option>
                            {categories.map((c) => (
                                <option key={c.value} value={c.value}>
                                    {c.label}
                                </option>
                            ))}
                        </select>
                        <select
                            value={f.action}
                            onChange={(e) =>
                                apply({ ...f, action: e.target.value })
                            }
                            className={control}
                            aria-label="Action"
                        >
                            <option value="">All actions</option>
                            {actions.map((a) => (
                                <option key={a.value} value={a.value}>
                                    {a.label}
                                </option>
                            ))}
                        </select>
                        <select
                            value={f.user}
                            onChange={(e) =>
                                apply({ ...f, user: e.target.value })
                            }
                            className={control}
                            aria-label="Staff member"
                        >
                            <option value="">All staff</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name}
                                </option>
                            ))}
                        </select>
                        <input
                            type="date"
                            value={f.from}
                            onChange={(e) =>
                                apply({ ...f, from: e.target.value })
                            }
                            className={control}
                            aria-label="From"
                        />
                        <input
                            type="date"
                            value={f.to}
                            onChange={(e) =>
                                apply({ ...f, to: e.target.value })
                            }
                            className={control}
                            aria-label="To"
                        />
                        <Button type="submit" variant="outline">
                            <Search /> Search
                        </Button>
                    </form>

                    {events.data.length === 0 ? (
                        <EmptyState
                            icon={History}
                            title="No matching records"
                        />
                    ) : (
                        <ul className="divide-y">
                            {events.data.map((e) => {
                                const [Icon, tone] = ICONS[e.action] ?? [
                                    History,
                                    'bg-muted text-muted-foreground',
                                ];

                                return (
                                    <li
                                        key={e.id}
                                        className="flex items-center gap-4 px-5 py-3"
                                    >
                                        <div
                                            className={cn(
                                                'grid size-9 shrink-0 place-items-center rounded-lg',
                                                tone,
                                            )}
                                        >
                                            <Icon className="size-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-medium text-navy-900 dark:text-white">
                                                {e.description}
                                            </div>
                                            <div className="truncate text-xs text-muted-foreground">
                                                {e.id_number ? (
                                                    <>
                                                        {e.card_id ? (
                                                            <Link
                                                                href={show(
                                                                    e.card_id,
                                                                )}
                                                                className="font-mono hover:underline"
                                                            >
                                                                {e.id_number}
                                                            </Link>
                                                        ) : (
                                                            <span className="font-mono">
                                                                {e.id_number}
                                                            </span>
                                                        )}
                                                        {e.holder_name &&
                                                            ` · ${e.holder_name}`}
                                                    </>
                                                ) : (
                                                    'Portal-wide'
                                                )}
                                            </div>
                                        </div>
                                        {e.category && e.category_label && (
                                            <CategoryBadge
                                                category={e.category}
                                                label={e.category_label}
                                                className="hidden sm:inline-flex"
                                            />
                                        )}
                                        <div className="hidden text-right text-sm md:block">
                                            <div className="font-medium">
                                                {e.user ?? 'System'}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {e.ip_address}
                                            </div>
                                        </div>
                                        <div
                                            className="w-40 shrink-0 text-right text-xs text-muted-foreground"
                                            suppressHydrationWarning
                                        >
                                            {formatDateTime(e.created_at)}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <Pagination page={events} noun="entries" />
                </div>
            </div>
        </>
    );
}

Records.layout = {
    breadcrumbs: [{ title: 'Records', href: records() }],
};
