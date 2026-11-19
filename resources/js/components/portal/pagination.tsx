import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types/portal';

export function Pagination<T>({
    page,
    noun = 'results',
}: {
    page: Paginated<T>;
    noun?: string;
}) {
    if (page.total === 0) {
        return null;
    }

    const numbered = page.links.slice(1, -1);

    return (
        <div className="flex flex-col items-center justify-between gap-3 border-t px-5 py-3 text-sm sm:flex-row">
            <div className="text-muted-foreground">
                Showing{' '}
                <span className="font-semibold text-foreground">
                    {page.from}
                </span>
                –
                <span className="font-semibold text-foreground">{page.to}</span>{' '}
                of{' '}
                <span className="font-semibold text-foreground">
                    {page.total}
                </span>{' '}
                {noun}
            </div>
            {page.last_page > 1 && (
                <nav className="flex items-center gap-1">
                    <PageLink
                        href={page.prev_page_url}
                        label={<ChevronLeft className="size-4" />}
                        aria="Previous page"
                    />
                    {numbered.map((l, i) =>
                        l.url ? (
                            <PageLink
                                key={i}
                                href={l.url}
                                label={l.label}
                                active={l.active}
                            />
                        ) : (
                            <span
                                key={i}
                                className="px-2 text-muted-foreground"
                            >
                                …
                            </span>
                        ),
                    )}
                    <PageLink
                        href={page.next_page_url}
                        label={<ChevronRight className="size-4" />}
                        aria="Next page"
                    />
                </nav>
            )}
        </div>
    );
}

function PageLink({
    href,
    label,
    active,
    aria,
}: {
    href: string | null;
    label: React.ReactNode;
    active?: boolean;
    aria?: string;
}) {
    const cls = cn(
        'grid h-8 min-w-8 place-items-center rounded-lg px-2 text-sm font-medium transition-colors',
        active
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        !href && 'pointer-events-none opacity-40',
    );

    return href ? (
        <Link
            href={href}
            preserveScroll
            preserveState
            className={cls}
            aria-label={aria}
        >
            {label}
        </Link>
    ) : (
        <span className={cls} aria-label={aria}>
            {label}
        </span>
    );
}
