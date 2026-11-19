// Background-removal engines. Each returns a "mask" canvas the same size as the
// input, whose alpha channel is the person (255) vs background (0).
//
//   Fast    MediaPipe selfie segmentation, runs in this browser (Apache-2.0).
//   Offline rembg on the portal server, reached only through the portal (MIT).
//
// Model files are served by the portal itself: there is no CDN fallback, so
// nothing about the photo or the page ever goes to a third party.
import type { ImageSegmenter } from '@mediapipe/tasks-vision';
import { canvasToBlob, makeCanvas } from './compose';

export type EngineKey = 'none' | 'mediapipe' | 'rembg';

export const ENGINES: Record<EngineKey, { label: string; note: string }> = {
    none: { label: 'Original', note: 'No removal' },
    mediapipe: { label: 'Fast', note: 'In this browser' },
    rembg: { label: 'Offline', note: 'On the portal server' },
};

export const REMBG_MODELS: Record<string, { label: string; note: string }> = {
    u2net_human_seg: { label: 'U²-Net human', note: 'people only · fastest' },
    'isnet-general-use': { label: 'ISNet general', note: 'any subject' },
    'birefnet-portrait': {
        label: 'BiRefNet portrait',
        note: 'best hair · very slow on CPU',
    },
};

/** Thrown with a message written for the operator. */
export class EngineError extends Error {}

type Status = (msg: string) => void;

// ---------- MediaPipe (Fast) ----------
let mpPromise: Promise<ImageSegmenter> | null = null;

async function getMediaPipe(onStatus?: Status): Promise<ImageSegmenter> {
    if (!mpPromise) {
        mpPromise = (async () => {
            onStatus?.('Loading the Fast engine…');
            const { FilesetResolver, ImageSegmenter } =
                await import('@mediapipe/tasks-vision');
            const fileset = await FilesetResolver.forVisionTasks('/mediapipe');
            const opts = (delegate: 'GPU' | 'CPU') => ({
                baseOptions: {
                    modelAssetPath: '/models/selfie_multiclass_256x256.tflite',
                    delegate,
                },
                runningMode: 'IMAGE' as const,
                outputCategoryMask: false,
                outputConfidenceMasks: true,
            });
            try {
                return await ImageSegmenter.createFromOptions(
                    fileset,
                    opts('GPU'),
                );
            } catch (e) {
                console.warn('MediaPipe GPU delegate failed, using CPU', e);

                return await ImageSegmenter.createFromOptions(
                    fileset,
                    opts('CPU'),
                );
            }
        })().catch((e: unknown) => {
            mpPromise = null;
            console.error(e);
            throw new EngineError(
                'The Fast engine could not load its model from the portal. Ask the administrator to run "npm run fetch-models".',
            );
        });
    }

    return mpPromise;
}

export async function maskWithMediaPipe(
    source: HTMLCanvasElement,
    onStatus?: Status,
): Promise<HTMLCanvasElement> {
    const segmenter = await getMediaPipe(onStatus);
    onStatus?.('Segmenting…');
    const result = segmenter.segment(source);
    try {
        // selfie_multiclass: mask 0 = background; everything else is the person
        const bg = result.confidenceMasks?.[0];
        if (!bg) {
            throw new EngineError('The Fast engine returned no mask.');
        }
        const { width: w, height: h } = bg;
        const data = bg.getAsFloat32Array();
        const small = makeCanvas(w, h);
        const ctx = small.getContext('2d')!;
        const img = ctx.createImageData(w, h);
        for (let i = 0; i < data.length; i++) {
            const j = i * 4;
            img.data[j] = img.data[j + 1] = img.data[j + 2] = 255;
            img.data[j + 3] = Math.round(
                Math.max(0, Math.min(1, 1 - data[i])) * 255,
            );
        }
        ctx.putImageData(img, 0, 0);
        const mask = makeCanvas(source.width, source.height);
        const mctx = mask.getContext('2d')!;
        mctx.imageSmoothingQuality = 'high';
        mctx.drawImage(small, 0, 0, source.width, source.height);

        return mask;
    } finally {
        result.close();
    }
}

// ---------- rembg on the portal server (Offline) ----------
function xsrfToken(): string {
    const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return m ? decodeURIComponent(m[1]) : '';
}

export async function maskWithRembg(
    source: HTMLCanvasElement,
    model: string,
    onStatus?: Status,
): Promise<HTMLCanvasElement> {
    onStatus?.('Sending to the portal server…');
    const form = new FormData();
    form.append(
        'file',
        await canvasToBlob(source, 'image/jpeg', 0.95),
        'photo.jpg',
    );
    form.append('model', model);

    onStatus?.(`Segmenting with ${REMBG_MODELS[model]?.label ?? model}…`);
    let res: Response;
    try {
        res = await fetch('/rembg/remove', {
            method: 'POST',
            body: form,
            credentials: 'same-origin',
            headers: {
                'X-XSRF-TOKEN': xsrfToken(),
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
    } catch {
        throw new EngineError(
            'Could not reach the portal server. Check the network connection.',
        );
    }

    if (!res.ok) {
        let message = `The Offline engine failed (${res.status}).`;
        try {
            const j = (await res.json()) as { message?: string };
            if (j.message) {
                message =
                    res.status === 419
                        ? 'Your session expired. Reload the page and sign in again.'
                        : j.message;
            }
        } catch {
            /* not JSON */
        }
        throw new EngineError(message);
    }

    // Greyscale PNG mask: move grey into the alpha channel
    const bmp = await createImageBitmap(await res.blob());
    const mask = makeCanvas(source.width, source.height);
    const ctx = mask.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bmp, 0, 0, source.width, source.height);
    bmp.close();
    const img = ctx.getImageData(0, 0, mask.width, mask.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
        d[i + 3] = d[i];
        d[i] = d[i + 1] = d[i + 2] = 255;
    }
    ctx.putImageData(img, 0, 0);

    return mask;
}
