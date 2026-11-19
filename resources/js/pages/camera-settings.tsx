import { Head } from '@inertiajs/react';
import { Monitor, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { CameraPanel } from '@/components/capture/camera-panel';
import { PageHeader, Panel } from '@/components/portal/ui';
import { Button } from '@/components/ui/button';
import { useCameraSettings } from '@/hooks/use-camera-settings';
import { REMBG_MODELS } from '@/lib/card-studio/segment';
import { cn } from '@/lib/utils';
import { cameraSettings } from '@/routes';

const control =
    'h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

function Choice<T extends string>({
    value,
    options,
    onChange,
}: {
    value: T;
    options: [T, string, string][];
    onChange: (v: T) => void;
}) {
    return (
        <div className="grid gap-2 sm:grid-cols-2">
            {options.map(([v, label, note]) => (
                <button
                    key={v}
                    type="button"
                    onClick={() => onChange(v)}
                    className={cn(
                        'rounded-xl border p-3 text-left transition-all',
                        value === v
                            ? 'border-navy-500 bg-navy-50/60 ring-4 ring-navy-500/10 dark:bg-navy-800/40'
                            : 'hover:border-navy-300',
                    )}
                >
                    <div className="text-sm font-semibold text-navy-900 dark:text-white">
                        {label}
                    </div>
                    <div className="text-xs text-muted-foreground">{note}</div>
                </button>
            ))}
        </div>
    );
}

/** "Camera settings" — stored in this browser, so each capture desk keeps its own. */
export default function CameraSettings() {
    const [settings, update, reset] = useCameraSettings();

    return (
        <>
            <Head title="Camera settings" />
            <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
                <PageHeader
                    eyebrow="Setup"
                    title="Camera settings"
                    description="These defaults belong to this computer and browser, so every capture desk can use its own camera."
                    actions={
                        <Button
                            variant="outline"
                            onClick={() => {
                                reset();
                                toast.success(
                                    'Camera settings reset for this computer.',
                                );
                            }}
                        >
                            <RotateCcw /> Reset to defaults
                        </Button>
                    }
                />

                <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground">
                    <Monitor className="size-5 text-navy-500" />
                    Changes save automatically on this computer.
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                    <Panel
                        title="Camera test"
                        description="Pick the camera, check the picture and the framing guide"
                    >
                        <CameraPanel
                            settings={settings}
                            onSettings={update}
                            onCapture={() =>
                                toast.success(
                                    'Camera works — photo taken (not saved).',
                                )
                            }
                        />
                    </Panel>

                    <div className="space-y-6">
                        <Panel title="Picture">
                            <div className="space-y-4">
                                <label className="grid gap-1.5 text-sm">
                                    <span className="font-medium">
                                        Resolution
                                    </span>
                                    <select
                                        className={control}
                                        value={settings.resolution}
                                        onChange={(e) =>
                                            update({
                                                resolution: e.target.value as
                                                    | '1080'
                                                    | '720',
                                            })
                                        }
                                    >
                                        <option value="1080">
                                            Full HD (1920 × 1080) — best for ID
                                            photos
                                        </option>
                                        <option value="720">
                                            HD (1280 × 720) — older or slower
                                            cameras
                                        </option>
                                    </select>
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    Mirror preview and the 3-second timer are
                                    under the camera picture.
                                </p>
                            </div>
                        </Panel>

                        <Panel title="Background removal">
                            <div className="space-y-4">
                                <Choice
                                    value={settings.engine}
                                    onChange={(engine) => update({ engine })}
                                    options={[
                                        [
                                            'mediapipe',
                                            'Fast',
                                            'Instant, runs in this browser',
                                        ],
                                        [
                                            'rembg',
                                            'Offline',
                                            'On the portal server, a few seconds',
                                        ],
                                    ]}
                                />
                                <label className="grid gap-1.5 text-sm">
                                    <span className="font-medium">
                                        Offline model
                                    </span>
                                    <select
                                        className={control}
                                        value={settings.rembgModel}
                                        onChange={(e) =>
                                            update({
                                                rembgModel: e.target.value,
                                            })
                                        }
                                    >
                                        {Object.entries(REMBG_MODELS).map(
                                            ([id, m]) => (
                                                <option key={id} value={id}>
                                                    {m.label} — {m.note}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </label>
                                <label className="grid gap-1.5 text-sm">
                                    <span className="flex justify-between font-medium">
                                        Edge softness{' '}
                                        <span className="font-normal text-muted-foreground">
                                            {settings.feather.toFixed(1)} px
                                        </span>
                                    </span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={6}
                                        step={0.5}
                                        value={settings.feather}
                                        onChange={(e) =>
                                            update({
                                                feather: parseFloat(
                                                    e.target.value,
                                                ),
                                            })
                                        }
                                        className="accent-navy-600"
                                    />
                                </label>
                                <label className="grid gap-1.5 text-sm">
                                    <span className="flex justify-between font-medium">
                                        Edge tightness{' '}
                                        <span className="font-normal text-muted-foreground">
                                            {Math.round(settings.tighten * 100)}
                                            %
                                        </span>
                                    </span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.05}
                                        value={settings.tighten}
                                        onChange={(e) =>
                                            update({
                                                tighten: parseFloat(
                                                    e.target.value,
                                                ),
                                            })
                                        }
                                        className="accent-navy-600"
                                    />
                                </label>
                            </div>
                        </Panel>
                    </div>
                </div>
            </div>
        </>
    );
}

CameraSettings.layout = {
    breadcrumbs: [{ title: 'Camera settings', href: cameraSettings() }],
};
