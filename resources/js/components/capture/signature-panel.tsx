import { router } from '@inertiajs/react';
import { Eraser, ImageUp, PenLine, Save, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { canvasToBlob, makeCanvas } from '@/lib/card-studio/compose';
import { destroy, store } from '@/routes/cards/signature';

/**
 * Turns a drawing or a scanned signature into ink on a transparent
 * background, cropped to the ink, so it prints cleanly on the card.
 */
function toInk(source: HTMLCanvasElement): HTMLCanvasElement | null {
    const ctx = source.getContext('2d', { willReadFrequently: true })!;
    const { width: w, height: h } = source;
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            // paper -> transparent, ink -> dark navy-black with soft edges
            const ink =
                d[i + 3] === 0
                    ? 0
                    : Math.max(0, Math.min(1, (200 - lum) / 110));
            d[i] = 20;
            d[i + 1] = 22;
            d[i + 2] = 40;
            d[i + 3] = Math.round(ink * 255);
            if (ink > 0.25) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        }
    }
    if (maxX < 0) {
        return null;
    }
    ctx.putImageData(img, 0, 0);

    const pad = 6;
    const cw = Math.min(w, maxX - minX + pad * 2);
    const ch = Math.min(h, maxY - minY + pad * 2);
    const out = makeCanvas(cw, ch);
    out.getContext('2d')!.drawImage(
        source,
        Math.max(0, minX - pad),
        Math.max(0, minY - pad),
        cw,
        ch,
        0,
        0,
        cw,
        ch,
    );

    return out;
}

export function SignaturePanel({
    cardId,
    current,
}: {
    cardId: number;
    current: string | null;
}) {
    const pad = useRef<HTMLCanvasElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const drawing = useRef(false);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const clear = () => {
        const c = pad.current;
        if (c) {
            const ctx = c.getContext('2d')!;
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, c.width, c.height);
        }
        setDirty(false);
        setError('');
    };

    useEffect(clear, []);

    const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const c = pad.current!;
        const r = c.getBoundingClientRect();

        return [
            ((e.clientX - r.left) * c.width) / r.width,
            ((e.clientY - r.top) * c.height) / r.height,
        ] as const;
    };

    const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        drawing.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        const ctx = pad.current!.getContext('2d')!;
        const [x, y] = point(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawing.current) {
            return;
        }
        const ctx = pad.current!.getContext('2d')!;
        const [x, y] = point(e);
        ctx.lineWidth =
            5 * (e.pressure > 0 && e.pressure !== 0.5 ? 0.6 + e.pressure : 1);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#111';
        ctx.lineTo(x, y);
        ctx.stroke();
        setDirty(true);
    };

    const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) {
            return;
        }
        const bmp = await createImageBitmap(f);
        const c = pad.current!;
        const ctx = c.getContext('2d')!;
        clear();
        const s = Math.min(c.width / bmp.width, c.height / bmp.height);
        ctx.drawImage(
            bmp,
            (c.width - bmp.width * s) / 2,
            (c.height - bmp.height * s) / 2,
            bmp.width * s,
            bmp.height * s,
        );
        bmp.close();
        setDirty(true);
    };

    const save = async () => {
        const src = pad.current;
        if (!src) {
            return;
        }
        const copy = makeCanvas(src.width, src.height);
        copy.getContext('2d')!.drawImage(src, 0, 0);
        const ink = toInk(copy);
        if (!ink) {
            setError(
                'No signature found. Sign in the box or upload a clearer scan.',
            );

            return;
        }
        setSaving(true);
        const blob = await canvasToBlob(ink, 'image/png');
        router.post(
            store.url(cardId),
            {
                signature: new File([blob], 'signature.png', {
                    type: 'image/png',
                }),
            },
            {
                forceFormData: true,
                preserveScroll: true,
                onError: (errs) => setError(Object.values(errs).join(' ')),
                onSuccess: () => clear(),
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <div className="space-y-3">
            {current && (
                <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
                    <div className="grid h-14 flex-1 place-items-center rounded-lg bg-white ring-1 ring-black/5">
                        <img
                            src={current}
                            alt="Saved signature"
                            className="max-h-12 max-w-full object-contain"
                        />
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                            router.delete(destroy.url(cardId), {
                                preserveScroll: true,
                            })
                        }
                    >
                        <Trash2 /> Remove
                    </Button>
                </div>
            )}
            <div className="relative overflow-hidden rounded-xl border-2 border-dashed bg-white">
                <canvas
                    ref={pad}
                    width={900}
                    height={300}
                    onPointerDown={onDown}
                    onPointerMove={onMove}
                    onPointerUp={() => (drawing.current = false)}
                    onPointerLeave={() => (drawing.current = false)}
                    className="block aspect-[3/1] w-full cursor-crosshair touch-none"
                    aria-label="Signature pad"
                />
                {!dirty && (
                    <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                        <span className="flex items-center gap-2">
                            <PenLine className="size-4" /> Sign here with the
                            mouse, pen or finger
                        </span>
                    </div>
                )}
                <div className="pointer-events-none absolute right-6 bottom-[22%] left-6 border-b border-slate-300" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={clear}
                    disabled={!dirty}
                >
                    <Eraser /> Clear
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                >
                    <ImageUp /> Upload a scan
                </Button>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => void onFile(e)}
                />
                <Button
                    size="sm"
                    className="ml-auto"
                    onClick={() => void save()}
                    disabled={!dirty || saving}
                >
                    <Save /> {current ? 'Replace signature' : 'Save signature'}
                </Button>
            </div>
        </div>
    );
}
