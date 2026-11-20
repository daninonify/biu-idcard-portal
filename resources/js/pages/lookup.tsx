import { Head, Link } from '@inertiajs/react';
import { Database, History, ScanSearch } from 'lucide-react';
import { IdSearch } from '@/components/portal/id-search';
import {
    CategoryBadge,
    EmptyState,
    Panel,
    StatusBadge,
    StudentAvatar,
    timeAgo,
} from '@/components/portal/ui';
import { lookup } from '@/routes';
import { show } from '@/routes/cards';
import type { CardRow, HolderType } from '@/types/portal';

type Source = { name: string; demo: string[] };

type Props = {
    type: HolderType;
    directories: Record<HolderType, Source>;
    recent: CardRow[];
};

export default function Lookup({ type, directories, recent }: Props) {
    return (
        <>
            <Head title="Lookup" />
            <div className="mx-auto w-full max-w-4xl space-y-8 p-4 md:p-8">
                <div className="brand-wash rounded-3xl border bg-card px-6 py-10 text-center md:px-12 md:py-14">
                    <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-navy-900 text-gold-300 shadow-lg">
                        <ScanSearch className="size-7" />
                    </div>
                    <h1 className="mt-5 text-3xl font-bold tracking-tight text-navy-900 dark:text-white">
                        Find a student or staff member
                    </h1>
                    <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                        Students by matric number, staff by staff number. Their
                        record is pulled from the student portal or the staff
                        records, and their card for this session opens.
                    </p>
                    <div className="mx-auto mt-8 max-w-xl text-left">
                        <IdSearch
                            size="lg"
                            autoFocus
                            defaultType={type}
                            hints={{
                                student: directories.student.demo,
                                staff: directories.staff.demo,
                            }}
                        />
                    </div>
                    <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1">
                            <Database className="size-3.5" /> Students:{' '}
                            {directories.student.name}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1">
                            <Database className="size-3.5" /> Staff:{' '}
                            {directories.staff.name}
                        </span>
                    </div>
                </div>

                <Panel title="Your recent cards" bodyClassName="p-0">
                    {recent.length === 0 ? (
                        <EmptyState
                            icon={History}
                            title="Nothing yet"
                            description="Students and staff you work on will appear here."
                        />
                    ) : (
                        <ul className="divide-y">
                            {recent.map((c) => (
                                <li key={c.id}>
                                    <Link
                                        href={show(c.id)}
                                        className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/50"
                                    >
                                        <StudentAvatar
                                            src={c.thumb_url}
                                            name={c.full_name}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate font-medium text-navy-900 dark:text-white">
                                                {c.full_name}
                                            </div>
                                            <div className="truncate text-xs text-muted-foreground">
                                                <span className="font-mono">
                                                    {c.id_number}
                                                </span>{' '}
                                                · {c.department}
                                            </div>
                                        </div>
                                        <CategoryBadge
                                            category={c.category}
                                            label={c.category_label}
                                            className="hidden sm:inline-flex"
                                        />
                                        <StatusBadge status={c.status} />
                                        <div
                                            className="hidden w-28 text-right text-xs text-muted-foreground md:block"
                                            suppressHydrationWarning
                                        >
                                            {timeAgo(c.updated_at)}
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            </div>
        </>
    );
}

Lookup.layout = {
    breadcrumbs: [{ title: 'Lookup', href: lookup() }],
};
