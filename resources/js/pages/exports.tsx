import { Head } from '@inertiajs/react';
import {
    Download,
    FileArchive,
    FileSpreadsheet,
    ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';
import { CategoryBadge, PageHeader, Panel } from '@/components/portal/ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { dataFiles } from '@/routes';
import { download } from '@/routes/data-files';
import type { Option } from '@/types/portal';

type Counts = {
    all: number;
    captured: number;
    printed: number;
    photos: number;
};

type Props = {
    session: string;
    sessions: string[];
    categories: Option[];
    counts: Record<string, Counts>;
};

const control =
    'h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

/** "Generate data files", per category. */
export default function Exports({
    session,
    sessions,
    categories,
    counts,
}: Props) {
    const [f, setF] = useState({
        session,
        category: 'all',
        status: 'all',
        from: '',
        to: '',
    });

    const url = (format: 'csv' | 'photos') =>
        download.url({
            query: Object.fromEntries(
                Object.entries({ ...f, format }).filter(([, v]) => v !== ''),
            ),
        });

    const sum = (key: keyof Counts) =>
        f.category === 'all'
            ? Object.values(counts).reduce((n, c) => n + c[key], 0)
            : (counts[f.category]?.[key] ?? 0);

    const formats = [
        {
            key: 'csv' as const,
            icon: FileSpreadsheet,
            title: 'Card data spreadsheet',
            body: 'CSV for Excel, grouped by category: ID number, names, faculty / directorate, department / unit, programme or designation, status, print dates and photo file name.',
        },
        {
            key: 'photos' as const,
            icon: FileArchive,
            title: 'Photos (ZIP)',
            body: 'Every processed passport photo in a folder per category (Undergraduate, Postgraduate, Staff), named by matric or staff number.',
        },
    ];

    const stats: [string, number][] = [
        ['Cards', sum('all')],
        ['Ready to print', sum('captured')],
        ['Printed', sum('printed')],
        ['With photos', sum('photos')],
    ];

    return (
        <>
            <Head title="Generate data files" />
            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
                <PageHeader
                    eyebrow="Data"
                    title="Generate data files"
                    description="Download card data and photos for a session, per category. Every download is recorded in Records."
                />

                {/* category picker */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { value: 'all', label: 'All categories' },
                        ...categories,
                    ].map((c) => (
                        <button
                            key={c.value}
                            type="button"
                            onClick={() => setF({ ...f, category: c.value })}
                            className={cn(
                                'flex items-center gap-2 rounded-xl border bg-card px-4 py-2 text-sm font-medium transition-all',
                                f.category === c.value
                                    ? 'border-navy-500 ring-4 ring-navy-500/10 dark:border-gold-400'
                                    : 'text-muted-foreground hover:border-navy-300',
                            )}
                        >
                            {c.value === 'all' ? (
                                c.label
                            ) : (
                                <CategoryBadge
                                    category={c.value}
                                    label={c.label}
                                />
                            )}
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {c.value === 'all'
                                    ? Object.values(counts).reduce(
                                          (n, x) => n + x.all,
                                          0,
                                      )
                                    : (counts[c.value]?.all ?? 0)}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                    {stats.map(([l, v]) => (
                        <div key={l} className="rounded-2xl border bg-card p-4">
                            <div className="text-xs font-medium text-muted-foreground">
                                {l}
                            </div>
                            <div className="mt-1 text-2xl font-bold text-navy-900 tabular-nums dark:text-white">
                                {v}
                            </div>
                        </div>
                    ))}
                </div>

                <Panel title="Which cards?">
                    <div className="grid gap-4 md:grid-cols-4">
                        <label className="grid gap-1.5 text-sm">
                            <span className="font-medium">Session</span>
                            <select
                                className={control}
                                value={f.session}
                                onChange={(e) =>
                                    setF({ ...f, session: e.target.value })
                                }
                            >
                                {[...new Set([session, ...sessions])].map(
                                    (s) => (
                                        <option key={s}>{s}</option>
                                    ),
                                )}
                            </select>
                        </label>
                        <label className="grid gap-1.5 text-sm">
                            <span className="font-medium">Status</span>
                            <select
                                className={control}
                                value={f.status}
                                onChange={(e) =>
                                    setF({ ...f, status: e.target.value })
                                }
                            >
                                <option value="all">All cards</option>
                                <option value="pending">Awaiting photo</option>
                                <option value="captured">Ready to print</option>
                                <option value="printed">Printed</option>
                            </select>
                        </label>
                        <label className="grid gap-1.5 text-sm">
                            <span className="font-medium">
                                Last activity from
                            </span>
                            <input
                                type="date"
                                className={control}
                                value={f.from}
                                onChange={(e) =>
                                    setF({ ...f, from: e.target.value })
                                }
                            />
                        </label>
                        <label className="grid gap-1.5 text-sm">
                            <span className="font-medium">to</span>
                            <input
                                type="date"
                                className={control}
                                value={f.to}
                                onChange={(e) =>
                                    setF({ ...f, to: e.target.value })
                                }
                            />
                        </label>
                    </div>
                </Panel>

                <div className="grid gap-4 md:grid-cols-2">
                    {formats.map((x) => (
                        <div
                            key={x.key}
                            className="flex flex-col rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md"
                        >
                            <div className="grid size-12 place-items-center rounded-xl bg-navy-900 text-gold-300">
                                <x.icon className="size-6" />
                            </div>
                            <h3 className="mt-4 font-semibold text-navy-900 dark:text-white">
                                {x.title}
                            </h3>
                            <p className="mt-1 flex-1 text-sm text-muted-foreground">
                                {x.body}
                            </p>
                            <Button asChild className="mt-5 self-start">
                                <a href={url(x.key)}>
                                    <Download /> Download
                                </a>
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
                    <ShieldAlert className="size-5 shrink-0" />
                    <p>
                        These files contain personal data of students and staff.
                        Keep them on university computers only, don't email them
                        to personal accounts, and delete them once they've been
                        used.
                    </p>
                </div>
            </div>
        </>
    );
}

Exports.layout = {
    breadcrumbs: [{ title: 'Generate data files', href: dataFiles() }],
};
