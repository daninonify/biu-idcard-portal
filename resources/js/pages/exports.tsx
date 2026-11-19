import { Head } from '@inertiajs/react';
import {
    Download,
    FileArchive,
    FileSpreadsheet,
    ShieldAlert,
} from 'lucide-react';
import { useState } from 'react';
import { PageHeader, Panel } from '@/components/portal/ui';
import { Button } from '@/components/ui/button';
import { dataFiles } from '@/routes';
import { download } from '@/routes/data-files';

type Props = {
    session: string;
    sessions: string[];
    counts: { all: number; captured: number; printed: number; photos: number };
};

const control =
    'h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

/** "Generate data files". */
export default function Exports({ session, sessions, counts }: Props) {
    const [f, setF] = useState({ session, status: 'all', from: '', to: '' });
    const url = (format: 'csv' | 'photos') =>
        download.url({
            query: Object.fromEntries(
                Object.entries({ ...f, format }).filter(([, v]) => v !== ''),
            ),
        });

    const formats = [
        {
            key: 'csv' as const,
            icon: FileSpreadsheet,
            title: 'Card data spreadsheet',
            body: 'CSV for Excel: matric number, names, faculty, department, programme, type, status, print dates and photo file name.',
        },
        {
            key: 'photos' as const,
            icon: FileArchive,
            title: 'Photos (ZIP)',
            body: 'Every processed passport photo, named by matric number (e.g. SCN-CSC-230101.jpg), for the card printer software or archives.',
        },
    ];

    const stats: [string, number][] = [
        ['Cards this session', counts.all],
        ['Ready to print', counts.captured],
        ['Printed', counts.printed],
        ['With photos', counts.photos],
    ];

    return (
        <>
            <Head title="Generate data files" />
            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
                <PageHeader
                    eyebrow="Data"
                    title="Generate data files"
                    description="Download card data and photos for a session. Every download is recorded in Records."
                />

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
                        These files contain students' personal data. Keep them
                        on university computers only, don't email them to
                        personal accounts, and delete them once they've been
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
