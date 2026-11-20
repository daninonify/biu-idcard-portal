import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, Ref } from 'react';
import type { Adjust, CardPhoto } from './types';

// All templates are drawn on a 540 x 856 canvas = CR80 portrait (54 x 85.6 mm)
// at 10 px per mm, so moving something 1 mm means changing it by 10.
export const CARD_W = 540;
export const CARD_H = 856;

export const abs = (
    left: number | undefined,
    top: number | undefined,
    extra: CSSProperties = {},
): CSSProperties => ({ position: 'absolute', left, top, ...extra });

export function Card({
    children,
    background = '#fff',
    innerRef,
}: {
    children: ReactNode;
    background?: string;
    innerRef?: Ref<HTMLDivElement>;
}) {
    return (
        <div
            ref={innerRef}
            className="id-card"
            style={{ width: CARD_W, height: CARD_H, background }}
        >
            {children}
        </div>
    );
}

/** Text that shrinks to fit a maximum width (long names). */
export function FitText({
    children,
    max,
    size,
    min = 12,
    style,
}: {
    children: ReactNode;
    max: number;
    size: number;
    min?: number;
    style?: CSSProperties;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const [fs, setFs] = useState(size);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) {
            return;
        }
        const fit = () => {
            let f = size;
            el.style.fontSize = `${f}px`;
            while (el.offsetWidth > max && f > min) {
                f -= 0.5;
                el.style.fontSize = `${f}px`;
            }
            setFs(f);
        };
        fit();
        void document.fonts?.ready.then(fit);
    }, [children, size, max, min]);

    return (
        <span
            ref={ref}
            style={{
                display: 'inline-block',
                whiteSpace: 'nowrap',
                ...style,
                fontSize: fs,
            }}
        >
            {children}
        </span>
    );
}

/**
 * The photo window. Frames the photo automatically from the head position,
 * then applies the operator's zoom / move adjustments.
 */
export function PhotoBox({
    photo,
    adjust,
    x,
    y,
    w,
    h,
    border,
}: {
    photo: CardPhoto | null;
    adjust: Adjust;
    x: number;
    y: number;
    w: number;
    h: number;
    border?: string;
}) {
    let img: ReactNode = null;

    if (photo?.url) {
        const { width: iw, height: ih, head } = photo;
        const margin = 0.08; // space above the head, as a share of the box height
        let scale = (h * (1 - margin)) / (ih * (1 - head.top));
        scale = Math.max(scale, (w * 0.9) / iw) * (adjust.zoom ?? 1);
        const left = w / 2 - head.cx * iw * scale + (adjust.offX ?? 0) * w;
        const top = h * margin - head.top * ih * scale + (adjust.offY ?? 0) * h;
        img = (
            <img
                src={photo.url}
                alt=""
                draggable={false}
                style={{
                    position: 'absolute',
                    left,
                    top,
                    width: iw * scale,
                    height: ih * scale,
                    maxWidth: 'none',
                }}
            />
        );
    }

    return (
        <div
            style={{
                ...abs(x, y),
                width: w,
                height: h,
                overflow: 'hidden',
                background: photo?.background ?? '#fff',
                boxSizing: 'border-box',
            }}
        >
            {img ?? <Silhouette w={w} h={h} />}
            {border && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        border,
                        pointerEvents: 'none',
                    }}
                />
            )}
        </div>
    );
}

function Silhouette({ w, h }: { w: number; h: number }) {
    return (
        <svg
            width={w}
            height={h}
            viewBox="0 0 100 130"
            preserveAspectRatio="xMidYMax slice"
            style={{ display: 'block', background: '#eef0f5' }}
        >
            <circle cx="50" cy="48" r="22" fill="#c9ceda" />
            <path
                d="M8 130 C 10 92, 30 80, 50 80 C 70 80, 90 92, 92 130 Z"
                fill="#c9ceda"
            />
        </svg>
    );
}
