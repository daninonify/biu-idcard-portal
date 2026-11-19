import { Camera, ImageUp, RefreshCw, Timer } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { CameraSettings } from '@/hooks/use-camera-settings';
import { fileToCanvas, toSourceCanvas } from '@/lib/card-studio/compose';
import { cn } from '@/lib/utils';

const ERRORS: Record<string, string> = {
    NotAllowedError:
        'Camera permission was blocked. Allow it from the camera icon in the address bar.',
    NotReadableError:
        'The camera is being used by another app (Teams, WhatsApp, Zoom, the Camera app or another tab). Close it, then press Restart.',
    NotFoundError: 'No camera found. Plug one in, then press Restart.',
};

type Props = {
    settings: CameraSettings;
    onSettings: (patch: Partial<CameraSettings>) => void;
    onCapture: (canvas: HTMLCanvasElement, label: string) => void;
    compact?: boolean;
};

export function CameraPanel({
    settings,
    onSettings,
    onCapture,
    compact = false,
}: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [error, setError] = useState('');
    const [res, setRes] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [flash, setFlash] = useState(false);

    const listDevices = useCallback(async () => {
        const all = await navigator.mediaDevices.enumerateDevices();
        setDevices(all.filter((d) => d.kind === 'videoinput'));
    }, []);

    const stop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    };

    const start = useCallback(
        async (id: string): Promise<void> => {
            stop();
            setError('');
            if (!navigator.mediaDevices?.getUserMedia) {
                setError(
                    'The camera needs HTTPS. Open the portal through its https:// address.',
                );

                return;
            }
            const height = settings.resolution === '720' ? 720 : 1080;
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        deviceId: id ? { exact: id } : undefined,
                        width: { ideal: Math.round((height * 16) / 9) },
                        height: { ideal: height },
                    },
                });
                streamRef.current = stream;
                const v = videoRef.current;
                if (v) {
                    v.srcObject = stream;
                    await v.play().catch(() => {});
                }
                const s = stream.getVideoTracks()[0].getSettings();
                setRes(s.width && s.height ? `${s.width}×${s.height}` : '');
                await listDevices();
            } catch (e) {
                const name = (e as DOMException).name;
                if (
                    id &&
                    (name === 'OverconstrainedError' ||
                        name === 'NotFoundError')
                ) {
                    onSettings({ deviceId: '' }); // saved camera unplugged: use the default one

                    return start('');
                }
                setError(
                    ERRORS[name] ?? `Camera error: ${(e as Error).message}`,
                );
                listDevices().catch(() => {});
            }
        },
        [listDevices, onSettings, settings.resolution],
    );

    useEffect(() => {
        void start(settings.deviceId);
        const onChange = () => void listDevices();
        navigator.mediaDevices?.addEventListener?.('devicechange', onChange);

        return () => {
            navigator.mediaDevices?.removeEventListener?.(
                'devicechange',
                onChange,
            );
            stop();
        };
        // restart only when the chosen camera or resolution changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings.deviceId, settings.resolution]);

    const grab = useCallback(() => {
        const v = videoRef.current;
        if (!v?.videoWidth) {
            return;
        }
        setFlash(true);
        window.setTimeout(() => setFlash(false), 180);
        onCapture(toSourceCanvas(v, v.videoWidth, v.videoHeight), 'Camera');
    }, [onCapture]);

    const capture = useCallback(() => {
        if (!settings.timer) {
            grab();

            return;
        }
        let n = 3;
        setCountdown(n);
        const t = window.setInterval(() => {
            n -= 1;
            if (n <= 0) {
                window.clearInterval(t);
                setCountdown(0);
                grab();
            } else {
                setCountdown(n);
            }
        }, 800);
    }, [grab, settings.timer]);

    // Spacebar captures (when not typing in a field)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (
                e.code === 'Space' &&
                !/INPUT|TEXTAREA|SELECT|BUTTON/.test(
                    document.activeElement?.tagName ?? '',
                )
            ) {
                e.preventDefault();
                capture();
            }
        };
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [capture]);

    const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            onCapture(await fileToCanvas(f), f.name);
        }
        e.target.value = '';
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <select
                    aria-label="Camera"
                    value={settings.deviceId}
                    onChange={(e) => onSettings({ deviceId: e.target.value })}
                    className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                    {devices.length === 0 && (
                        <option value="">Default camera</option>
                    )}
                    {devices.map((d, i) => (
                        <option key={d.deviceId} value={d.deviceId}>
                            {d.label || `Camera ${i + 1}`}
                        </option>
                    ))}
                </select>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => void start(settings.deviceId)}
                    title="Restart camera"
                >
                    <RefreshCw />
                </Button>
            </div>

            <div
                className={cn(
                    'relative overflow-hidden rounded-xl bg-navy-950 ring-1 ring-black/10',
                    compact ? 'aspect-[4/3]' : 'aspect-video',
                )}
            >
                <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="size-full object-cover"
                    style={{
                        transform: settings.mirror ? 'scaleX(-1)' : 'none',
                    }}
                />
                {/* framing guide */}
                <svg
                    className="pointer-events-none absolute inset-0 size-full"
                    viewBox="0 0 160 90"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <ellipse
                        cx="80"
                        cy="38"
                        rx="17"
                        ry="23"
                        fill="none"
                        stroke="#f3cf6b"
                        strokeWidth="0.7"
                        strokeDasharray="2 1.5"
                        opacity="0.9"
                    />
                    <path
                        d="M48 90 C 52 70, 64 64, 80 64 C 96 64, 108 70, 112 90"
                        fill="none"
                        stroke="#f3cf6b"
                        strokeWidth="0.7"
                        strokeDasharray="2 1.5"
                        opacity="0.9"
                    />
                </svg>
                {res && (
                    <span className="absolute top-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                        {res}
                    </span>
                )}
                {countdown > 0 && (
                    <div className="absolute inset-0 grid place-items-center bg-black/25 text-8xl font-bold text-white drop-shadow-lg">
                        {countdown}
                    </div>
                )}
                {flash && (
                    <div className="absolute inset-0 animate-out bg-white duration-200 fade-out" />
                )}
                {error && (
                    <div className="absolute inset-0 grid place-items-center bg-navy-950/90 p-6 text-center text-sm text-white">
                        {error}
                    </div>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    size="lg"
                    className="flex-1 bg-gold-400 text-navy-950 hover:bg-gold-300"
                    onClick={capture}
                    disabled={!!error}
                >
                    <Camera />
                    Capture
                    <kbd className="ml-1 rounded border border-navy-950/20 bg-white/40 px-1.5 text-[10px] font-semibold">
                        SPACE
                    </kbd>
                </Button>
                <Button
                    size="lg"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                >
                    <ImageUp />
                    Upload
                </Button>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => void onFile(e)}
                />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <label className="flex cursor-pointer items-center gap-2">
                    <input
                        type="checkbox"
                        className="accent-navy-600"
                        checked={settings.mirror}
                        onChange={(e) =>
                            onSettings({ mirror: e.target.checked })
                        }
                    />
                    Mirror preview
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                    <input
                        type="checkbox"
                        className="accent-navy-600"
                        checked={settings.timer}
                        onChange={(e) =>
                            onSettings({ timer: e.target.checked })
                        }
                    />
                    <Timer className="size-3.5" /> 3-second timer
                </label>
            </div>
        </div>
    );
}
