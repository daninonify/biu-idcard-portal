import { Head, Link, router } from '@inertiajs/react';
import { CheckCircle2, CloudUpload, ImageUp, Info } from 'lucide-react';
import { useState } from 'react';
import { Pagination } from '@/components/portal/pagination';
import { EmptyState, PageHeader, timeAgo } from '@/components/portal/ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { portalPictures } from '@/routes';
import { show as showCard } from '@/routes/cards';
import { store } from '@/routes/portal-pictures';
import type { CardRow, Paginated } from '@/types/portal';

type Props = {
    cards: Paginated<CardRow>;
    show: 'waiting' | 'sent';
    portal: { name: string; canUpdatePhoto: boolean };
    waiting: number;
};

/** "Update portal pictures": push captured photos back to the student portal. */
export default function PortalPictures({
    cards,
    show,
    portal,
    waiting,
}: Props) {
    const [selected, setSelected] = useState<number[]>([]);
    const [sending, setSending] = useState(false);
    const canSend = show === 'waiting' && portal.canUpdatePhoto;
    const toggle = (id: number) =>
        setSelected((s) =>
            s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
        );
    const pageIds = cards.data.map((c) => c.id);
    const allSelected =
        pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

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

    const tabs: ['waiting' | 'sent', string][] = [
        ['waiting', `Waiting (${waiting})`],
        ['sent', 'Already sent'],
    ];

    return (
        <>
            <Head title="Update portal pictures" />
            <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
                <PageHeader
                    eyebrow="Data"
                    title="Update portal pictures"
                    description={`Send the new passport photos to ${portal.name}, so each student's portal profile matches their ID card.`}
                    actions={
                        canSend && (
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

                {!portal.canUpdatePhoto && (
                    <div className="flex gap-3 rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
                        <Info className="size-5 shrink-0 text-navy-500" />
                        This student portal connection can only read records. An
                        administrator can enable sending photos back in the
                        portal configuration (PORTAL_DB_PHOTO_COLUMN or
                        PORTAL_API_PHOTO_PATH).
                    </div>
                )}

                <div className="inline-flex rounded-xl bg-muted p-1">
                    {tabs.map(([k, l]) => (
                        <Link
                            key={k}
                            href={portalPictures({ query: { show: k } })}
                            preserveScroll
                            className={cn(
                                'rounded-lg px-4 py-1.5 text-sm font-medium',
                                show === k
                                    ? 'bg-background text-navy-900 shadow-sm dark:text-white'
                                    : 'text-muted-foreground',
                            )}
                        >
                            {l}
                        </Link>
                    ))}
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
                                    ? 'Every captured photo is already on the student portal.'
                                    : undefined
                            }
                        />
                    ) : (
                        <>
                            {canSend && (
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
                                            <Link
                                                href={showCard(c.id)}
                                                className="block p-2.5"
                                            >
                                                <div className="truncate text-sm font-semibold text-navy-900 dark:text-white">
                                                    {c.full_name}
                                                </div>
                                                <div className="truncate font-mono text-[11px] text-muted-foreground">
                                                    {c.matric_no}
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
