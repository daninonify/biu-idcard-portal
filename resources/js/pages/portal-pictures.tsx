import { Head, Link, router } from '@inertiajs/react';
import { CheckCircle2, CloudUpload, ImageUp, Info } from 'lucide-react';
import { useState } from 'react';
import { Pagination } from '@/components/portal/pagination';
import {
    CategoryBadge,
    EmptyState,
    PageHeader,
    timeAgo,
} from '@/components/portal/ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { portalPictures } from '@/routes';
import { show as showCard } from '@/routes/cards';
import { store } from '@/routes/portal-pictures';
import type { CardRow, HolderType, Paginated } from '@/types/portal';

type Portal = { name: string; canUpdatePhoto: boolean };

type Props = {
    cards: Paginated<CardRow>;
    show: 'waiting' | 'sent';
    category: string;
    categories: { value: string; label: string; waiting: number }[];
    portals: Record<HolderType, Portal>;
    waiting: number;
};

/** "Update portal pictures": students' photos to the student portal, staff photos to the staff records. */
export default function PortalPictures({
    cards,
    show,
    category,
    categories,
    portals,
    waiting,
}: Props) {
    const [selected, setSelected] = useState<number[]>([]);
    const [sending, setSending] = useState(false);
    const sendable =
        show === 'waiting' ? cards.data.filter((c) => c.can_send) : [];
    const pageIds = sendable.map((c) => c.id);
    const allSelected =
        pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
    const toggle = (id: number) =>
        setSelected((s) =>
            s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
        );
    const readOnly = (Object.entries(portals) as [HolderType, Portal][]).filter(
        ([, p]) => !p.canUpdatePhoto,
    );

    const go = (query: Record<string, string>) =>
        router.get(
            portalPictures.url(),
            { show, category, ...query },
            { preserveScroll: true, preserveState: true, replace: true },
        );

    const send = (ids: number[]) => {
        setSending(true);
        router.post(
            store.url(),
            { cards: ids },
            {
                preserveScroll: true,
                onFinish: () => {
                    setSending(false);
                    setSelected([]);
                },
            },
        );
    };

    return (
        <>
            <Head title="Update portal pictures" />
            <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
                <PageHeader
                    eyebrow="Data"
                    title="Update portal pictures"
                    description="Send new passport photos back, so each person's record matches their ID card: students to the student portal, staff to the staff records."
                    actions={
                        show === 'waiting' && (
                            <>
                                <Button
                                    variant="outline"
                                    disabled={!selected.length || sending}
                                    onClick={() => send(selected)}
                                >
                                    <CloudUpload /> Send selected (
                                    {selected.length})
                                </Button>
                                <Button
                                    disabled={!pageIds.length || sending}
                                    onClick={() => send(pageIds)}
                                >
                                    <CloudUpload /> Send all on this page
                                </Button>
                            </>
                        )
                    }
                />

                {readOnly.length > 0 && (
                    <div className="flex gap-3 rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
                        <Info className="size-5 shrink-0 text-navy-500" />
                        <div>
                            {readOnly.map(([type, p]) => (
                                <div key={type}>
                                    <span className="font-medium text-foreground">
                                        {type === 'staff'
                                            ? 'Staff'
                                            : 'Students'}
                                        :
                                    </span>{' '}
                                    {p.name} can only be read, so these photos
                                    can't be sent back yet.
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {categories.map((c) => (
                            <button
                                key={c.value}
                                onClick={() => go({ category: c.value })}
                                className={cn(
                                    'flex items-center gap-2 rounded-xl border bg-card px-3.5 py-1.5 text-sm font-medium transition-all',
                                    category === c.value
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
                                    {c.waiting} waiting
                                </span>
                            </button>
                        ))}
                    </div>
                    <div className="inline-flex rounded-xl bg-muted p-1">
                        {(
                            [
                                ['waiting', `Waiting (${waiting})`],
                                ['sent', 'Already sent'],
                            ] as const
                        ).map(([k, l]) => (
                            <button
                                key={k}
                                onClick={() => go({ show: k })}
                                className={cn(
                                    'rounded-lg px-4 py-1.5 text-sm font-medium',
                                    show === k
                                        ? 'bg-background text-navy-900 shadow-sm dark:text-white'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border bg-card">
                    {cards.data.length === 0 ? (
                        <EmptyState
                            icon={show === 'waiting' ? CheckCircle2 : ImageUp}
                            title={
                                show === 'waiting'
                                    ? 'All caught up'
                                    : 'Nothing sent yet'
                            }
                            description={
                                show === 'waiting'
                                    ? 'Every captured photo in this category has been sent back.'
                                    : undefined
                            }
                        />
                    ) : (
                        <>
                            {pageIds.length > 0 && (
                                <label className="flex items-center gap-2 border-b px-5 py-3 text-sm text-muted-foreground">
                                    <input
                                        type="checkbox"
                                        className="accent-navy-600"
                                        checked={allSelected}
                                        onChange={() =>
                                            setSelected(
                                                allSelected
                                                    ? selected.filter(
                                                          (id) =>
                                                              !pageIds.includes(
                                                                  id,
                                                              ),
                                                      )
                                                    : [
                                                          ...new Set([
                                                              ...selected,
                                                              ...pageIds,
                                                          ]),
                                                      ],
                                            )
                                        }
                                    />
                                    Select all on this page
                                </label>
                            )}
                            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                                {cards.data.map((c) => {
                                    const on = selected.includes(c.id);
                                    const canSend =
                                        show === 'waiting' && !!c.can_send;

                                    return (
                                        <div
                                            key={c.id}
                                            className={cn(
                                                'group relative overflow-hidden rounded-xl border bg-background transition-all',
                                                on &&
                                                    'border-navy-500 ring-4 ring-navy-500/15',
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    canSend && toggle(c.id)
                                                }
                                                className="block aspect-[3/4] w-full overflow-hidden bg-muted"
                                            >
                                                {c.thumb_url && (
                                                    <img
                                                        src={c.thumb_url}
                                                        alt=""
                                                        className="size-full object-cover transition-transform group-hover:scale-105"
                                                    />
                                                )}
                                            </button>
                                            {canSend && (
                                                <input
                                                    type="checkbox"
                                                    checked={on}
                                                    onChange={() =>
                                                        toggle(c.id)
                                                    }
                                                    className="absolute top-2 left-2 size-4 accent-navy-600"
                                                    aria-label={`Select ${c.full_name}`}
                                                />
                                            )}
                                            <CategoryBadge
                                                category={c.category}
                                                label={c.category_label}
                                                className="absolute top-2 right-2 shadow-sm"
                                            />
                                            <Link
                                                href={showCard(c.id)}
                                                className="block p-2.5"
                                            >
                                                <div className="truncate text-sm font-semibold text-navy-900 dark:text-white">
                                                    {c.full_name}
                                                </div>
                                                <div className="truncate font-mono text-[11px] text-muted-foreground">
                                                    {c.id_number}
                                                </div>
                                                <div
                                                    className="mt-1 text-[11px] text-muted-foreground"
                                                    suppressHydrationWarning
                                                >
                                                    {show === 'sent'
                                                        ? `Sent ${timeAgo(c.portal_photo_synced_at)}`
                                                        : `Taken ${timeAgo(c.captured_at)}`}
                                                </div>
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                    <Pagination page={cards} noun="photos" />
                </div>
            </div>
        </>
    );
}

PortalPictures.layout = {
    breadcrumbs: [{ title: 'Update portal pictures', href: portalPictures() }],
};
