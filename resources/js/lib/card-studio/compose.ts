// Turns an original photo + mask into a finished photo on a solid background,
// and works out where the head is so templates can frame it automatically.
import type { Head } from '@/components/id-card/types';

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;

    return c;
}

const MAX_SIDE = 1600;

type Drawable = CanvasImageSource & { width?: number; height?: number };

/** Copy a video frame / bitmap into a canvas, downscaled to MAX_SIDE. */
export function toSourceCanvas(
    drawable: Drawable,
    w: number,
    h: number,
): HTMLCanvasElement {
    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    const c = makeCanvas(Math.round(w * scale), Math.round(h * scale));
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(drawable, 0, 0, c.width, c.height);

    return c;
}

export async function fileToCanvas(file: Blob): Promise<HTMLCanvasElement> {
    const bmp = await createImageBitmap(file, {
        imageOrientation: 'from-image',
    });
    const c = toSourceCanvas(bmp, bmp.width, bmp.height);
    bmp.close();

    return c;
}

export function thumbOf(
    canvas: HTMLCanvasElement,
    max = 240,
): HTMLCanvasElement {
    const s = max / Math.max(canvas.width, canvas.height);
    const c = makeCanvas(
        Math.round(canvas.width * s),
        Math.round(canvas.height * s),
    );
    c.getContext('2d')!.drawImage(canvas, 0, 0, c.width, c.height);

    return c;
}

function smoothstep(e0: number, e1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));

    return t * t * (3 - 2 * t);
}

/**
 * Refine a raw mask: blur (feather) then tighten the edge to cut halos.
 * feather: px of blur; tighten: 0 (soft) .. 1 (hard, cuts more edge)
 */
export function refineMask(
    mask: HTMLCanvasElement,
    { feather = 1.5, tighten = 0.35 }: { feather?: number; tighten?: number },
): HTMLCanvasElement {
    const out = makeCanvas(mask.width, mask.height);
    const ctx = out.getContext('2d', { willReadFrequently: true })!;
    ctx.filter = feather > 0 ? `blur(${feather}px)` : 'none';
    ctx.drawImage(mask, 0, 0);
    ctx.filter = 'none';
    const img = ctx.getImageData(0, 0, out.width, out.height);
    const d = img.data;
    const lo = 0.05 + tighten * 0.45;
    const hi = Math.min(0.98, lo + 0.45 - tighten * 0.25);
    for (let i = 3; i < d.length; i += 4) {
        d[i] = Math.round(smoothstep(lo, hi, d[i] / 255) * 255);
    }
    ctx.putImageData(img, 0, 0);

    return out;
}

/** Top of the head and the head's horizontal centre, as 0..1 of the image. */
export function findHead(mask: HTMLCanvasElement | null): Head {
    if (!mask) {
        return { top: 0.08, cx: 0.5, found: false };
    }
    const sw = 160;
    const sh = Math.max(1, Math.round((mask.height / mask.width) * sw));
    const small = makeCanvas(sw, sh);
    const ctx = small.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(mask, 0, 0, sw, sh);
    const d = ctx.getImageData(0, 0, sw, sh).data;
    const on = (x: number, y: number) => d[(y * sw + x) * 4 + 3] > 128;

    let top = -1;
    for (let y = 0; y < sh && top < 0; y++) {
        let count = 0;
        for (let x = 0; x < sw; x++) {
            if (on(x, y)) {
                count++;
            }
        }
        if (count >= 3) {
            top = y; // ignore single stray pixels
        }
    }
    if (top < 0) {
        return { top: 0.08, cx: 0.5, found: false };
    }

    const band = Math.max(4, Math.round(sh * 0.15));
    let sum = 0;
    let n = 0;
    for (let y = top; y < Math.min(sh, top + band); y++) {
        for (let x = 0; x < sw; x++) {
            if (on(x, y)) {
                sum += x;
                n++;
            }
        }
    }

    return { top: top / sh, cx: n ? sum / n / sw : 0.5, found: true };
}

/** Composite the person over a solid colour. */
export function composite(
    source: HTMLCanvasElement,
    refinedMask: HTMLCanvasElement | null,
    background: string,
): HTMLCanvasElement {
    const out = makeCanvas(source.width, source.height);
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, out.width, out.height);
    if (!refinedMask) {
        ctx.drawImage(source, 0, 0);

        return out;
    }
    const person = makeCanvas(source.width, source.height);
    const pctx = person.getContext('2d')!;
    pctx.drawImage(source, 0, 0);
    pctx.globalCompositeOperation = 'destination-in';
    pctx.drawImage(refinedMask, 0, 0);
    ctx.drawImage(person, 0, 0);

    return out;
}

export function canvasToBlob(
    canvas: HTMLCanvasElement,
    type = 'image/jpeg',
    quality = 0.92,
): Promise<Blob> {
    return new Promise((resolve, reject) =>
        canvas.toBlob(
            (b) =>
                b
                    ? resolve(b)
                    : reject(new Error('Could not encode the image')),
            type,
            quality,
        ),
    );
}
