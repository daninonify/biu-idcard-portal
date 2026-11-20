import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Printer, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ScaledCard, TEMPLATES } from '@/components/id-card';
import type { Adjust, CardData, Signatures } from '@/components/id-card';
import InputError from '@/components/input-error';
import { Panel } from '@/components/portal/ui';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useCardPhoto } from '@/hooks/use-card-photo';
import { capture, index, printed, show } from '@/routes/cards';
import type { CardDetail, HolderDetail } from '@/types/portal';

type Props = {
    card: CardDetail;
    holder: HolderDetail;
    cardData: CardData;
    signatures: Signatures;
    reprintRequiresReason: boolean;
};

const CHECKLIST = [
    ['Printer', 'HID FARGO DTC1250e (or your card printer)'],
    ['Paper size', 'CR80 — 54 × 86 mm'],
    ['Margins', 'None'],
    ['Scale', '100% (not "fit to page")'],
    ['Background graphics', 'On'],
    ['Two-sided', 'On, if the printer prints both sides'],
] as const;

export default function PrintCard({
    card,
    holder,
    cardData,
    signatures,
    reprintRequiresReason,
}: Props) {
    const photo = useCardPhoto(card);
    const [confirm, setConfirm] = useState(false);
    const T = TEMPLATES[card.template];
    const adjust: Adjust = card.framing ?? { zoom: 1, offX: 0, offY: 0 };
    const reprint = card.print_count > 0;

    // After the print dialog closes, ask whether the card came out right.
    useEffect(() => {
        const after = () => setConfirm(true);
        window.addEventListener('afterprint', after);

        return () => window.removeEventListener('afterprint', after);
    }, []);

    const doPrint = async () => {
        await document.fonts.ready;
        window.print();
    };

    return (
        <>
            <Head title={`Print · ${holder.full_name}`} />
            <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
                <div className="flex flex-wrap items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={show(card.id)} aria-label="Back to record">
                            <ArrowLeft />
                        </Link>
                    </Button>
                    <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold tracking-[0.14em] text-gold-600 uppercase">
                            {reprint
                                ? `Reprint · copy ${card.print_count + 1}`
                                : 'Print card'}
                        </div>
                        <h1 className="truncate text-2xl font-bold text-navy-900 dark:text-white">
                            {holder.full_name}
                        </h1>
                        <div className="font-mono text-sm text-muted-foreground">
                            {holder.id_number}
                        </div>
                    </div>
                    <Button variant="outline" size="lg" asChild>
                        <Link href={capture(card.id)}>
                            <RotateCcw /> Retake photo
                        </Link>
                    </Button>
                    <Button
                        size="lg"
                        onClick={() => void doPrint()}
                        disabled={!photo}
                        className="bg-gold-400 text-navy-950 hover:bg-gold-300"
                    >
                        <Printer /> Print front + back
                    </Button>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                    <div className="flex flex-wrap items-start justify-center gap-8 rounded-3xl border bg-[radial-gradient(circle_at_30%_20%,oklch(0.95_0.02_275),transparent_60%)] p-8 dark:bg-none">
                        <div className="flex flex-col items-center gap-3">
                            <ScaledCard scale={0.52}>
                                <T.Front
                                    data={cardData}
                                    photo={photo}
                                    adjust={adjust}
                                    signatures={signatures}
                                />
                            </ScaledCard>
                            <span className="text-sm font-medium text-muted-foreground">
                                Page 1 · Front
                            </span>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                            <ScaledCard scale={0.52}>
                                <T.Back
                                    data={cardData}
                                    photo={photo}
                                    adjust={adjust}
                                    signatures={signatures}
                                />
                            </ScaledCard>
                            <span className="text-sm font-medium text-muted-foreground">
                                Page 2 · Back
                            </span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <Panel title="In the print dialog">
                            <dl className="space-y-3 text-sm">
                                {CHECKLIST.map(([k, v]) => (
                                    <div key={k} className="flex gap-3">
                                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                                        <div>
                                            <dt className="font-semibold text-navy-900 dark:text-white">
                                                {k}
                                            </dt>
                                            <dd className="text-muted-foreground">
                                                {v}
                                            </dd>
                                        </div>
                                    </div>
                                ))}
                            </dl>
                        </Panel>
                        <Panel title="Already printed?">
                            <p className="text-sm text-muted-foreground">
                                If the print dialog was closed before you could
                                confirm, record it here.
                            </p>
                            <Button
                                variant="outline"
                                className="mt-4 w-full"
                                onClick={() => setConfirm(true)}
                            >
                                <CheckCircle2 /> Confirm the card printed
                            </Button>
                        </Panel>
                    </div>
                </div>
            </div>

            {/* what actually goes to the printer: one CR80 card per page */}
            {createPortal(
                <div className="print-only" aria-hidden>
                    <div className="print-page">
                        <T.Front
                            data={cardData}
                            photo={photo}
                            adjust={adjust}
                            signatures={signatures}
                        />
                    </div>
                    <div className="print-page">
                        <T.Back
                            data={cardData}
                            photo={photo}
                            adjust={adjust}
                            signatures={signatures}
                        />
                    </div>
                </div>,
                document.body,
            )}

            <Dialog open={confirm} onOpenChange={setConfirm}>
                <DialogContent>
                    <Form {...printed.form(card.id)} className="space-y-5">
                        {({ processing, errors }) => (
                            <>
                                <DialogHeader>
                                    <DialogTitle>
                                        Did the card print correctly?
                                    </DialogTitle>
                                    <DialogDescription>
                                        Check the photo, name and colours on the
                                        card before confirming.{' '}
                                        {reprint &&
                                            'This will be recorded as a reprint.'}
                                    </DialogDescription>
                                </DialogHeader>
                                {reprint && (
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="reason">
                                            Reason for reprint{' '}
                                            {reprintRequiresReason
                                                ? ''
                                                : '(optional)'}
                                        </Label>
                                        <Input
                                            id="reason"
                                            name="reason"
                                            placeholder="e.g. Lost card, damaged in printer, name corrected"
                                            autoFocus
                                        />
                                        <InputError message={errors.reason} />
                                    </div>
                                )}
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setConfirm(false)}
                                    >
                                        No, print again
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        {processing ? (
                                            <Spinner />
                                        ) : (
                                            <CheckCircle2 />
                                        )}{' '}
                                        Yes, mark as printed
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    );
}

PrintCard.layout = {
    breadcrumbs: [
        { title: 'Card status', href: index() },
        { title: 'Print', href: '#' },
    ],
};
