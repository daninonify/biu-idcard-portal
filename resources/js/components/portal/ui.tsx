import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Page title block with optional actions on the right. */
export function PageHeader({
    eyebrow,
    title,
    description,
    actions,
    className,
}: {
    eyebrow?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-col gap-4 md:flex-row md:items-end md:justify-between',
                className,
            )}
        >
            <div className="min-w-0 space-y-1.5">
                {eyebrow && (
                    <div className="text-xs font-semibold tracking-[0.14em] text-gold-600 uppercase dark:text-gold-400">
                        {eyebrow}
                    </div>
                )}
                <h1 className="text-2xl font-bold tracking-tight text-navy-900 md:text-[28px] dark:text-white">
                    {title}
                </h1>
                {description && (
                    <p className="max-w-2xl text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
}

export function Panel({
    title,
    description,
    actions,
    children,
    className,
    bodyClassName,
}: {
    title?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    bodyClassName?: string;
}) {
    return (
        <section
            className={cn(
                'rounded-2xl border bg-card shadow-[0_1px_2px_rgba(20,24,70,0.04)]',
                className,
            )}
        >
            {(title || actions) && (
                <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
                    <div className="min-w-0">
                        {title && (
                            <h2 className="font-semibold text-navy-900 dark:text-white">
                                {title}
                            </h2>
                        )}
                        {description && (
                            <p
                                className="mt-0.5 text-sm text-muted-foreground"
                                suppressHydrationWarning
                            >
                                {description}
                            </p>
                        )}
                    </div>
                    {actions && (
                        <div className="flex shrink-0 items-center gap-2">
                            {actions}
                        </div>
                    )}
                </header>
            )}
            <div className={cn('p-5', bodyClassName)}>{children}</div>
        </section>
    );
}

const STATUS: Record<
    string,
    { label: string; className: string; dot: string }
> = {
    pending: {
        label: 'Awaiting photo',
        className:
            'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300',
        dot: 'bg-amber-500',
    },
    captured: {
        label: 'Ready to print',
        className:
            'bg-navy-50 text-navy-700 ring-navy-600/20 dark:bg-navy-400/15 dark:text-navy-200',
        dot: 'bg-navy-500',
    },
    printed: {
        label: 'Printed',
        className:
            'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300',
        dot: 'bg-emerald-500',
    },
};

export function StatusBadge({
    status,
    className,
}: {
    status: string;
    className?: string;
}) {
    const s = STATUS[status] ?? STATUS.pending;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset',
                s.className,
                className,
            )}
        >
            <span className={cn('size-1.5 rounded-full', s.dot)} />
            {s.label}
        </span>
    );
}

export function StatCard({
    label,
    value,
    hint,
    icon: Icon,
    tone = 'navy',
}: {
    label: string;
    value: ReactNode;
    hint?: ReactNode;
    icon: LucideIcon;
    tone?: 'navy' | 'gold' | 'green' | 'slate';
}) {
    const tones = {
        navy: 'bg-navy-50 text-navy-600 dark:bg-navy-400/15 dark:text-navy-200',
        gold: 'bg-gold-50 text-gold-700 dark:bg-gold-400/15 dark:text-gold-300',
        green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
        slate: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
    } as const;

    return (
        <div className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(20,24,70,0.04)]">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm font-medium text-muted-foreground">
                        {label}
                    </div>
                    <div className="mt-2 text-3xl font-bold tracking-tight text-navy-900 tabular-nums dark:text-white">
                        {value}
                    </div>
                </div>
                <div
                    className={cn(
                        'grid size-10 place-items-center rounded-xl',
                        tones[tone],
                    )}
                >
                    <Icon className="size-5" />
                </div>
            </div>
            {hint && (
                <div className="mt-3 text-xs text-muted-foreground">{hint}</div>
            )}
        </div>
    );
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: LucideIcon;
    title: string;
    description?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-navy-50 text-navy-500 dark:bg-white/10 dark:text-navy-200">
                <Icon className="size-6" />
            </div>
            <h3 className="mt-4 font-semibold text-navy-900 dark:text-white">
                {title}
            </h3>
            {description && (
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    {description}
                </p>
            )}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

/** Square thumbnail of a captured photo, or initials. */
export function StudentAvatar({
    src,
    name,
    className,
}: {
    src?: string | null;
    name: string;
    className?: string;
}) {
    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('');

    return src ? (
        <img
            src={src}
            alt=""
            className={cn(
                'size-10 shrink-0 rounded-lg object-cover ring-1 ring-black/5',
                className,
            )}
        />
    ) : (
        <div
            className={cn(
                'grid size-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-navy-100 to-navy-200 text-xs font-bold text-navy-700 dark:from-navy-700 dark:to-navy-800 dark:text-navy-100',
                className,
            )}
        >
            {initials}
        </div>
    );
}

export function formatDateTime(iso?: string | null): string {
    if (!iso) {
        return '—';
    }

    return new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatDate(iso?: string | null): string {
    if (!iso) {
        return '—';
    }

    return new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function timeAgo(iso?: string | null): string {
    if (!iso) {
        return '—';
    }
    const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    const steps: [number, string][] = [
        [60, 'second'],
        [60, 'minute'],
        [24, 'hour'],
        [7, 'day'],
        [4.35, 'week'],
        [12, 'month'],
    ];
    let v = Math.max(1, s);
    for (const [n, unit] of steps) {
        if (v < n) {
            return `${Math.floor(v)} ${unit}${Math.floor(v) === 1 ? '' : 's'} ago`;
        }
        v /= n;
    }

    return `${Math.floor(v)} years ago`;
}
