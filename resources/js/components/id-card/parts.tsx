import JsBarcode from 'jsbarcode';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, Ref } from 'react';
import type { Adjust, CardData, CardPhoto } from './types';

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

/** Text rotated around its centre point (cx, cy). */
export function Rotated({
    cx,
    cy,
    deg = -90,
    style,
    children,
}: {
    cx: number;
    cy: number;
    deg?: number;
    style?: CSSProperties;
    children: ReactNode;
}) {
    return (
        <div
            style={{
                position: 'absolute',
                left: cx,
                top: cy,
                transform: `translate(-50%, -50%) rotate(${deg}deg)`,
                whiteSpace: 'nowrap',
                lineHeight: 1,
                ...style,
            }}
        >
            {children}
        </div>
    );
}

export function Barcode({
    value,
    width,
    height,
    color = '#111',
}: {
    value: string | null;
    width: number;
    height: number;
    color?: string;
}) {
    const ref = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const svg = ref.current;
        if (!svg) {
            return;
        }
        try {
            JsBarcode(svg, value || ' ', {
                format: 'CODE128',
                displayValue: false,
                margin: 0,
                height: 100,
                width: 2,
                background: 'transparent',
                lineColor: color,
            });
            const w = parseFloat(svg.getAttribute('width') ?? '0');
            const h = parseFloat(svg.getAttribute('height') ?? '0');
            svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
            svg.removeAttribute('width');
            svg.removeAttribute('height');
            svg.setAttribute('preserveAspectRatio', 'none');
        } catch {
            /* invalid value: leave empty */
        }
    }, [value, color]);

    return <svg ref={ref} style={{ display: 'block', width, height }} />;
}

/** The gold ribbon across the top of the white templates. */
export function Swoosh({ left = 150, id }: { left?: number; id: string }) {
    return (
        <svg
            style={abs(0, 0)}
            width={CARD_W}
            height={60}
            viewBox={`0 0 ${CARD_W} 60`}
        >
            <defs>
                <linearGradient id={id} x1="0" x2="1">
                    <stop offset="0" stopColor="#f6d77a" stopOpacity="0.2" />
                    <stop offset="0.35" stopColor="#efc04a" />
                    <stop offset="1" stopColor="#e0a828" />
                </linearGradient>
            </defs>
            <path
                d={`M${left} 2 C ${left + 140} 34, ${left + 260} 34, 540 4 L540 18 C ${left + 260} 50, ${left + 140} 44, ${left} 2 Z`}
                fill={`url(#${id})`}
            />
            <path
                d={`M${left + 40} 0 C ${left + 170} 18, ${left + 280} 16, 540 0`}
                stroke="#f3cf6b"
                strokeWidth="5"
                fill="none"
                opacity="0.7"
            />
        </svg>
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

// ---------- name formatting ----------
const initial = (s: string | null) =>
    s?.trim() ? `${s.trim()[0].toUpperCase()}.` : '';
const up = (s: string | null) => (s || '').trim().toUpperCase();

/** Undergraduate: "SURNAME" / "FIRSTNAME M." */
export const nameUG = (d: CardData): [string, string] => [
    up(d.surname),
    [up(d.firstName), initial(d.middleName)].filter(Boolean).join(' '),
];

/** Postgraduate: "SURNAME .M." / "FIRSTNAME" */
export const namePG = (d: CardData): [string, string] => [
    [up(d.surname), d.middleName?.trim() ? `.${initial(d.middleName)}` : '']
        .filter(Boolean)
        .join(' '),
    up(d.firstName),
];
