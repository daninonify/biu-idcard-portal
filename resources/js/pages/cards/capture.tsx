import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    Loader2,
    Printer,
    RotateCcw,
    Save,
    Wand2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CameraPanel } from '@/components/capture/camera-panel';
import { DEFAULT_ADJUST, ScaledCard, TEMPLATES } from '@/components/id-card';
import type {
    Adjust,
    CardData,
    CardPhoto,
    Head as HeadPos,
    Signatures,
} from '@/components/id-card';
import { Panel } from '@/components/portal/ui';
import { Button } from '@/components/ui/button';
import { useCameraSettings } from '@/hooks/use-camera-settings';
import {
    canvasToBlob,
    composite,
    findHead,
    refineMask,
    thumbOf,
} from '@/lib/card-studio/compose';
import {
    ENGINES,
    EngineError,
    REMBG_MODELS,
    maskWithMediaPipe,
    maskWithRembg,
} from '@/lib/card-studio/segment';
import type { EngineKey } from '@/lib/card-studio/segment';
import { cn } from '@/lib/utils';
import { index, show } from '@/routes/cards';
import { store as storePhoto } from '@/routes/cards/photo';
import type { CardDetail, StudentDetail } from '@/types/portal';

type Props = {
    card: CardDetail;
    student: StudentDetail;
    cardData: CardData;
    signatures: Signatures;
    defaults: { background: string };
    rembgModels: string[];
};

type Shot = {
    id: number;
    source: HTMLCanvasElement;
    thumb: string;
    masks: Record<string, HTMLCanvasElement>;
    heads: Record<string, HeadPos>;
    times: Record<string, number>;
};

const BACKGROUNDS = [
    { name: 'White', value: '#ffffff' },
    { name: 'Off-white', value: '#f4f4f2' },
    { name: 'Light grey', value: '#e6e8ec' },
    { name: 'Light blue', value: '#dce8f7' },
    { name: 'Sky blue', value: '#9fc6ee' },
];

let nextShot = 1;

export default function Capture({
    card,
    student,
    cardData,
    signatures,
    defaults,
    rembgModels,
}: Props) {
    const [settings, updateSettings] = useCameraSettings();
    const [shots, setShots] = useState<Shot[]>([]);
    const [currentId, setCurrentId] = useState<number | null>(null);
    const [engine, setEngine] = useState<EngineKey>(settings.engine);
    const [rembgModel, setRembgModel] = useState(
        rembgModels.includes(settings.rembgModel)
            ? settings.rembgModel
            : rembgModels[0],
    );
    const [bg, setBg] = useState(
        card.framing?.background ?? defaults.background ?? '#ffffff',
    );
    const [feather, setFeather] = useState(settings.feather);
    const [tighten, setTighten] = useState(settings.tighten);
    const [adjust, setAdjust] = useState<Adjust>(DEFAULT_ADJUST);
    const [busy, setBusy] = useState<{ engine: EngineKey; msg: string } | null>(
        null,
    );
    const [error, setError] = useState('');
    const [version, setVersion] = useState(0);
    const [processed, setProcessed] = useState<CardPhoto | null>(null);
    const [tiles, setTiles] = useState<Partial<Record<EngineKey, string>>>({});
    const [saving, setSaving] = useState(false);
    const processedCanvas = useRef<HTMLCanvasElement | null>(null);

    const shot = shots.find((s) => s.id === currentId) ?? null;
    const keyOf = useCallback(
        (eng: EngineKey) => (eng === 'rembg' ? `rembg:${rembgModel}` : eng),
        [rembgModel],
    );
    const T = TEMPLATES[card.template];

    const onCapture = useCallback((canvas: HTMLCanvasElement) => {
        const s: Shot = {
            id: nextShot++,
            source: canvas,
            thumb: thumbOf(canvas, 160).toDataURL('image/jpeg', 0.8),
            masks: {},
            heads: {},
            times: {},
        };
        setShots((list) => [s, ...list].slice(0, 6));
        setCurrentId(s.id);
        setAdjust(DEFAULT_ADJUST);
    }, []);

    const runEngine = useCallback(
        async (eng: EngineKey, s: Shot | null = shot) => {
            const key = keyOf(eng);
            if (!s || eng === 'none' || s.masks[key] || busy) {
                return;
            }
            setError('');
            setBusy({ engine: eng, msg: 'Starting…' });
            const t0 = performance.now();
            const status = (msg: string) => setBusy({ engine: eng, msg });
            try {
                const mask =
                    eng === 'mediapipe'
                        ? await maskWithMediaPipe(s.source, status)
                        : await maskWithRembg(s.source, rembgModel, status);
                s.masks[key] = mask;
                s.heads[key] = findHead(mask);
                s.times[key] = Math.round(performance.now() - t0);
                setVersion((v) => v + 1);
            } catch (e) {
                console.error(e);
                setError(
                    e instanceof EngineError
                        ? e.message
                        : `${ENGINES[eng].label} engine failed: ${(e as Error).message}`,
                );
            } finally {
                setBusy(null);
            }
        },
        [shot, busy, keyOf, rembgModel],
    );

    // run the chosen engine on each new shot
    useEffect(() => {
        if (shot && engine !== 'none' && !shot.masks[keyOf(engine)]) {
            void runEngine(engine, shot);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentId, engine, rembgModel]);

    // compose the finished photo + comparison tiles
    useEffect(() => {
        if (!shot) {
            setProcessed(null);
            processedCanvas.current = null;

            return;
        }
        const mask = engine === 'none' ? null : shot.masks[keyOf(engine)];
        if (engine !== 'none' && !mask) {
            return;
        }
        const out = composite(
            shot.source,
            mask ? refineMask(mask, { feather, tighten }) : null,
            bg,
        );
        processedCanvas.current = out;
        const head =
            engine === 'none'
                ? findHead(Object.values(shot.masks)[0] ?? null)
                : shot.heads[keyOf(engine)];
        setProcessed({
            url: out.toDataURL('image/jpeg', 0.92),
            width: out.width,
            height: out.height,
            head,
            background: engine === 'none' ? '#ffffff' : bg,
        });

        const small = thumbOf(shot.source, 220);
        const next: Partial<Record<EngineKey, string>> = {
            none: small.toDataURL('image/jpeg', 0.8),
        };
        for (const eng of ['mediapipe', 'rembg'] as const) {
            const m = shot.masks[keyOf(eng)];
            if (m) {
                const sm = thumbOf(m, 220);
                next[eng] = composite(
                    small,
                    refineMask(sm, {
                        feather: feather * (220 / Math.max(m.width, m.height)),
                        tighten,
                    }),
                    bg,
                ).toDataURL('image/jpeg', 0.85);
            }
        }
        setTiles(next);
    }, [shot, engine, bg, feather, tighten, version, keyOf]);

    const engineTiles = useMemo(
        () =>
            (['mediapipe', 'rembg', 'none'] as const).map((key) => ({
                key,
                ...ENGINES[key],
                preview: tiles[key],
                time: shot?.times[keyOf(key)],
                ready: key === 'none' || !!shot?.masks[keyOf(key)],
            })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [tiles, shot, version, keyOf],
    );

    const save = async (thenPrint: boolean) => {
        if (!processedCanvas.current || !processed) {
            return;
        }
        setSaving(true);
        const blob = await canvasToBlob(
            processedCanvas.current,
            'image/jpeg',
            0.92,
        );
        router.post(
            storePhoto.url(card.id),
            {
                photo: new File([blob], 'photo.jpg', { type: 'image/jpeg' }),
                engine: keyOf(engine),
                framing: JSON.stringify({
                    ...adjust,
                    head: processed.head,
                    background: processed.background,
                }),
                next: thenPrint ? 'print' : 'record',
            },
            {
                forceFormData: true,
                onError: (errs) => setError(Object.values(errs).join(' ')),
                onFinish: () => setSaving(false),
            },
        );
    };

    const setAdj =
        (k: keyof Adjust) => (e: React.ChangeEvent<HTMLInputElement>) =>
            setAdjust((a) => ({ ...a, [k]: parseFloat(e.target.value) }));
    const ready = !!processed && !busy;

    return (
        <>
            <Head title={`Capture · ${student.full_name}`} />
            <div className="mx-auto w-full max-w-[1500px] space-y-5 px-4 pt-4 md:px-6 md:pt-6">
                {/* student strip */}
                <div className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card px-5 py-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={show(card.id)} aria-label="Back to record">
                            <ArrowLeft />
                        </Link>
                    </Button>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-lg font-bold text-navy-900 dark:text-white">
                            {student.full_name}
                        </div>
                        <div className="truncate text-sm text-muted-foreground">
                            <span className="font-mono font-semibold text-navy-700 dark:text-navy-200">
                                {student.matric_no}
                            </span>{' '}
                            · {student.department} · {card.template_label} card
                        </div>
                    </div>
                    {card.has_photo && (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-600/20">
                            Saving replaces the current photo
                        </span>
                    )}
                </div>

                <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-[1.1fr_1fr_auto]">
                    {/* 1. camera */}
                    <Panel
                        title="1 · Camera"
                        description="Line the face up with the guide, then press Space"
                    >
                        <CameraPanel
                            settings={settings}
                            onSettings={updateSettings}
                            onCapture={onCapture}
                        />
                        {shots.length > 0 && (
                            <div className="mt-4">
                                <div className="mb-2 text-xs font-medium text-muted-foreground">
                                    Shots this session (click to reuse)
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {shots.map((s) => (
                                        <button
                                            key={s.id}
                                            onClick={() => setCurrentId(s.id)}
                                            className={cn(
                                                'h-20 w-16 shrink-0 overflow-hidden rounded-lg ring-2 transition-all',
                                                s.id === currentId
                                                    ? 'ring-gold-400'
                                                    : 'opacity-70 ring-transparent hover:opacity-100',
                                            )}
                                        >
                                            <img
                                                src={s.thumb}
                                                alt=""
                                                className="size-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Panel>

                    {/* 2. background + framing */}
                    <div className="space-y-5">
                        <Panel
                            title="2 · Background"
                            actions={
                                busy && (
                                    <span className="flex items-center gap-1.5 rounded-full bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-700 dark:bg-navy-800 dark:text-navy-100">
                                        <Loader2 className="size-3.5 animate-spin" />{' '}
                                        {busy.msg}
                                    </span>
                                )
                            }
                        >
                            <div className="grid grid-cols-3 gap-3">
                                {engineTiles.map((t) => (
                                    <button
                                        key={t.key}
                                        onClick={() => {
                                            setEngine(t.key);
                                            if (t.key !== 'none') {
                                                updateSettings({
                                                    engine: t.key,
                                                });
                                            }
                                            if (!t.ready) {
                                                void runEngine(t.key);
                                            }
                                        }}
                                        disabled={
                                            !!busy &&
                                            busy.engine !== t.key &&
                                            !t.ready
                                        }
                                        className={cn(
                                            'group flex flex-col gap-2 rounded-xl border p-2 text-left transition-all disabled:opacity-50',
                                            engine === t.key
                                                ? 'border-navy-500 ring-4 ring-navy-500/15'
                                                : 'hover:border-navy-300',
                                        )}
                                    >
                                        <div
                                            className="grid aspect-[3/4] place-items-center overflow-hidden rounded-lg text-xs text-muted-foreground"
                                            style={{
                                                background:
                                                    t.key === 'none'
                                                        ? '#e5e7eb'
                                                        : bg,
                                            }}
                                        >
                                            {t.preview ? (
                                                <img
                                                    src={t.preview}
                                                    alt=""
                                                    className="size-full object-cover"
                                                />
                                            ) : busy?.engine === t.key ? (
                                                <Loader2 className="size-5 animate-spin text-navy-500" />
                                            ) : shot ? (
                                                <span className="flex items-center gap-1">
                                                    <Wand2 className="size-3.5" />{' '}
                                                    Run
                                                </span>
                                            ) : (
                                                '—'
                                            )}
                                        </div>
                                        <div className="px-0.5">
                                            <div className="flex items-center justify-between text-sm font-semibold">
                                                {t.label}
                                                {engine === t.key &&
                                                    t.ready &&
                                                    shot && (
                                                        <Check className="size-4 text-navy-500" />
                                                    )}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                                {t.time != null
                                                    ? `${(t.time / 1000).toFixed(1)} s`
                                                    : t.note}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {engine === 'rembg' && (
                                <label className="mt-4 grid gap-1.5 text-sm">
                                    <span className="font-medium">
                                        Offline model
                                    </span>
                                    <select
                                        value={rembgModel}
                                        disabled={!!busy}
                                        onChange={(e) => {
                                            setRembgModel(e.target.value);
                                            updateSettings({
                                                rembgModel: e.target.value,
                                            });
                                        }}
                                        className="h-9 rounded-md border border-input bg-background px-3 shadow-xs"
                                    >
                                        {rembgModels.map((m) => (
                                            <option key={m} value={m}>
                                                {REMBG_MODELS[m]?.label ?? m} —{' '}
                                                {REMBG_MODELS[m]?.note}
                                                {shot?.masks[`rembg:${m}`]
                                                    ? ' ✓'
                                                    : ''}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}

                            {error && (
                                <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                    {error}
                                </p>
                            )}

                            <div className="mt-5 space-y-4">
                                <div>
                                    <div className="mb-2 text-sm font-medium">
                                        Background colour
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {BACKGROUNDS.map((b) => (
                                            <button
                                                key={b.value}
                                                title={b.name}
                                                onClick={() => setBg(b.value)}
                                                className={cn(
                                                    'size-8 rounded-full ring-1 ring-black/10 transition-transform hover:scale-110',
                                                    bg === b.value &&
                                                        'ring-[3px] ring-navy-500 ring-offset-2 ring-offset-background',
                                                )}
                                                style={{ background: b.value }}
                                            />
                                        ))}
                                        <label
                                            className="relative size-8 cursor-pointer overflow-hidden rounded-full ring-1 ring-black/10"
                                            title="Custom colour"
                                            style={{
                                                background:
                                                    'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                                            }}
                                        >
                                            <input
                                                type="color"
                                                value={bg}
                                                onChange={(e) =>
                                                    setBg(e.target.value)
                                                }
                                                className="absolute inset-0 cursor-pointer opacity-0"
                                            />
                                        </label>
                                    </div>
                                </div>
                                <Slider
                                    label="Edge softness"
                                    value={feather}
                                    display={`${feather.toFixed(1)} px`}
                                    min={0}
                                    max={6}
                                    step={0.5}
                                    onChange={(v) => {
                                        setFeather(v);
                                        updateSettings({ feather: v });
                                    }}
                                />
                                <Slider
                                    label="Edge tightness"
                                    value={tighten}
                                    display={`${Math.round(tighten * 100)}%`}
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    onChange={(v) => {
                                        setTighten(v);
                                        updateSettings({ tighten: v });
                                    }}
                                />
                            </div>
                        </Panel>

                        <Panel
                            title="3 · Framing"
                            description={
                                processed && !processed.head.found
                                    ? 'No outline found, so framing uses the image centre.'
                                    : 'Centred on the head automatically'
                            }
                            actions={
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setAdjust(DEFAULT_ADJUST)}
                                >
                                    <RotateCcw /> Reset
                                </Button>
                            }
                        >
                            <div className="space-y-4">
                                <Slider
                                    label="Zoom"
                                    value={adjust.zoom}
                                    display={`${adjust.zoom.toFixed(2)}×`}
                                    min={0.6}
                                    max={2.2}
                                    step={0.01}
                                    onChange={(v) =>
                                        setAdjust((a) => ({ ...a, zoom: v }))
                                    }
                                />
                                <label className="grid gap-1.5 text-sm">
                                    <span className="font-medium">
                                        Left / right
                                    </span>
                                    <input
                                        type="range"
                                        min="-0.5"
                                        max="0.5"
                                        step="0.005"
                                        value={adjust.offX}
                                        onChange={setAdj('offX')}
                                        className="accent-navy-600"
                                    />
                                </label>
                                <label className="grid gap-1.5 text-sm">
                                    <span className="font-medium">
                                        Up / down
                                    </span>
                                    <input
                                        type="range"
                                        min="-0.5"
                                        max="0.5"
                                        step="0.005"
                                        value={adjust.offY}
                                        onChange={setAdj('offY')}
                                        className="accent-navy-600"
                                    />
                                </label>
                            </div>
                        </Panel>
                    </div>

                    {/* 4. live card */}
                    <Panel
                        title="4 · Card preview"
                        className="lg:col-span-2 2xl:col-span-1"
                        bodyClassName="flex flex-wrap items-start justify-center gap-5 rounded-b-2xl bg-muted/40 py-6"
                    >
                        <div className="flex flex-col items-center gap-2">
                            <ScaledCard scale={0.5}>
                                <T.Front
                                    data={cardData}
                                    photo={processed}
                                    adjust={adjust}
                                    signatures={signatures}
                                />
                            </ScaledCard>
                            <span className="text-xs font-medium text-muted-foreground">
                                Front · exact print layout
                            </span>
                        </div>
                        <div className="flex flex-col items-center gap-2 2xl:hidden">
                            <ScaledCard scale={0.5}>
                                <T.Back
                                    data={cardData}
                                    photo={processed}
                                    adjust={adjust}
                                    signatures={signatures}
                                />
                            </ScaledCard>
                            <span className="text-xs font-medium text-muted-foreground">
                                Back
                            </span>
                        </div>
                    </Panel>
                </div>

                {/* action bar, sticks to the bottom of the content area */}
                <div className="sticky bottom-0 z-20 -mx-4 mt-5 rounded-t-2xl border-t bg-background/85 backdrop-blur-md md:-mx-6">
                    <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
                        <div className="hidden text-sm text-muted-foreground sm:block">
                            {!shot
                                ? 'Capture or upload a photo to begin.'
                                : busy
                                  ? busy.msg
                                  : processed
                                    ? `Using ${ENGINES[engine].label}${engine === 'rembg' ? ` · ${REMBG_MODELS[rembgModel]?.label}` : ''} on ${bg}`
                                    : 'Processing…'}
                        </div>
                        <div className="flex flex-1 justify-end gap-2 sm:flex-none">
                            <Button variant="outline" size="lg" asChild>
                                <Link href={show(card.id)}>Cancel</Link>
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                disabled={!ready || saving}
                                onClick={() => void save(false)}
                            >
                                {saving ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <Save />
                                )}{' '}
                                Save photo
                            </Button>
                            <Button
                                size="lg"
                                disabled={!ready || saving}
                                onClick={() => void save(true)}
                                className="bg-gold-400 text-navy-950 hover:bg-gold-300"
                            >
                                <Printer /> Save & print
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function Slider({
    label,
    value,
    display,
    min,
    max,
    step,
    onChange,
}: {
    label: string;
    value: number;
    display: string;
    min: number;
    max: number;
    step: number;
    onChange: (v: number) => void;
}) {
    return (
        <label className="grid gap-1.5 text-sm">
            <span className="flex justify-between font-medium">
                {label}{' '}
                <span className="font-normal text-muted-foreground tabular-nums">
                    {display}
                </span>
            </span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="accent-navy-600"
            />
        </label>
    );
}

Capture.layout = {
    breadcrumbs: [
        { title: 'Card status', href: index() },
        { title: 'Capture', href: '#' },
    ],
};
