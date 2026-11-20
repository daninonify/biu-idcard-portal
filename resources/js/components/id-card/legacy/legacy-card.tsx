import JsBarcode from 'jsbarcode';
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Card, FitText, PhotoBox } from '../parts';
import type { CardData, CardProps } from '../types';
import { LEGACY_SPECS } from './specs';
import type {
    LegacyElement,
    LegacyField,
    LegacyFont,
    LegacySpec,
} from './types';

/** The card canvas is 10 px per mm, so 1 pt = 0.3528 mm = 3.528 px. */
const MM = 10;
const PT = 3.528;

/**
 * The .rpt files name Windows fonts, but the cards as printed are set in Lato
 * (thin vertical STUDENT / STAFF, heavy names). Lato is bundled with the
 * portal, so cards look the same on every PC.
 */
const LATO = 'Lato, "Segoe UI", Arial, sans-serif';

export type LegacyKey = keyof typeof LEGACY_SPECS;

/** Undergraduate cards came in three colour schemes, by student type. */
export function legacyKeyFor(template: 'ug' | 'pg' | 'staff'): LegacyKey {
    // postgraduate cards have their own front (pg-front.tsx) and share the student back
    return template === 'staff' ? 'staff' : 'ug';
}

function fontCss(font?: LegacyFont): CSSProperties {
    if (!font) {
        return {};
    }
    // weights matched to the printed cards
    const weight =
        font.family === 'Arial Black' || (font.bold && font.size >= 11)
            ? 900
            : font.bold
              ? 700
              : font.size >= 18
                ? 300
                : 400;

    return {
        fontFamily: LATO,
        fontSize: font.size * PT,
        fontWeight: weight,
        fontStyle: font.italic ? 'italic' : 'normal',
    };
}

function fieldValue(field: LegacyField, d: CardData): string {
    const up = (s?: string | null) => (s ?? '').trim().toUpperCase();
    const id = d.staffNo || d.matric || '';

    switch (field) {
        case 'surname':
            return up(d.surname);
        case 'otherNames': {
            // as printed: first name and middle initial, e.g. "IDONGESIT E."
            const mid = d.middleName?.trim()
                ? `${d.middleName.trim()[0]}.`
                : '';

            return up([d.firstName, mid].filter(Boolean).join(' '));
        }
        case 'department':
            return up(d.department);
        case 'programme':
            return up([d.programme, d.department].filter(Boolean).join(' '));
        case 'matric':
            return up(d.matric);
        case 'faculty':
            return up(d.faculty);
        case 'validUntil':
            return up(d.validUntil);
        case 'staffNo':
            return up(d.staffNo);
        case 'barcodeTitle':
            return up(id);
    }
}

/**
 * Places a box from the layout. Rotated boxes are given as the box on the
 * card, so the content inside is laid out with width/height swapped and turned.
 */
function Placed({
    x,
    y,
    w,
    h,
    rot = 0,
    style,
    children,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
    rot?: number;
    style?: CSSProperties;
    children?: ReactNode;
}) {
    const turned = rot % 180 !== 0;
    const innerW = (turned ? h : w) * MM;
    const innerH = (turned ? w : h) * MM;

    return (
        <div
            style={{
                position: 'absolute',
                left: (x + w / 2) * MM,
                top: (y + h / 2) * MM,
                width: innerW,
                height: innerH,
                transform: `translate(-50%, -50%) rotate(${-rot}deg)`,
                overflow: 'hidden',
                ...style,
            }}
        >
            {children}
        </div>
    );
}

/**
 * Multi-line text that shrinks a little when the browser's fonts wrap it
 * onto more lines than Crystal Reports did, so no line is cut off.
 */
function ShrinkText({ size, children }: { size: number; children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) {
            return;
        }
        const fit = () => {
            let f = size;
            el.style.fontSize = `${f}px`;
            while (el.scrollHeight > el.clientHeight + 1 && f > size * 0.7) {
                f -= 0.25;
                el.style.fontSize = `${f}px`;
            }
        };
        fit();
        void document.fonts?.ready.then(fit);
    }, [size, children]);

    return (
        <div
            ref={ref}
            style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                fontSize: size,
            }}
        >
            {children}
        </div>
    );
}

/** Code 39, the symbology the old cards printed (Free 3 of 9), scaled to its box. */
function Code39({ value }: { value: string }) {
    const ref = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const svg = ref.current;
        if (!svg) {
            return;
        }
        try {
            JsBarcode(svg, value.toUpperCase() || ' ', {
                format: 'CODE39',
                displayValue: false,
                margin: 0,
                height: 100,
                width: 2,
                background: 'transparent',
                lineColor: '#000',
            });
            const w = parseFloat(svg.getAttribute('width') ?? '0');
            const h = parseFloat(svg.getAttribute('height') ?? '0');
            svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
            svg.removeAttribute('width');
            svg.removeAttribute('height');
            svg.setAttribute('preserveAspectRatio', 'none');
        } catch {
            /* characters Code 39 cannot encode: leave the space empty */
        }
    }, [value]);

    return (
        <svg
            ref={ref}
            style={{ display: 'block', width: '100%', height: '100%' }}
        />
    );
}

function Element({ el, props }: { el: LegacyElement; props: CardProps }) {
    const { data, photo, adjust, signatures } = props;

    switch (el.kind) {
        case 'image':
            return (
                <Placed {...el}>
                    <img
                        src={el.src}
                        alt=""
                        draggable={false}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'fill',
                        }}
                    />
                </Placed>
            );
        case 'box':
            return (
                <Placed
                    {...el}
                    style={{ background: el.bg ?? 'transparent' }}
                />
            );
        case 'photo':
            return (
                <PhotoBox
                    photo={photo}
                    adjust={adjust}
                    x={el.x * MM}
                    y={el.y * MM}
                    w={el.w * MM}
                    h={el.h * MM}
                    border={el.border}
                />
            );
        case 'barcode':
            return (
                <Placed {...el}>
                    <Code39 value={data.staffNo || data.matric || ''} />
                </Placed>
            );
        case 'registrarSignature': {
            // The old templates' signatures are stored already turned to fit the tall
            // box; an uploaded one is upright, so turn it like the text beside it.
            const uploaded = signatures?.registrar ?? null;
            const src = uploaded ?? signatures?.legacy?.[el.variant] ?? null;

            return (
                <Placed {...el} rot={uploaded ? 90 : 0}>
                    {src && (
                        <img
                            src={src}
                            alt=""
                            draggable={false}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                            }}
                        />
                    )}
                </Placed>
            );
        }
        case 'typeMarker': {
            // the old app printed a Wingdings bullet in the colour of the student type
            if (
                data.studentType !== el.studentType &&
                !(el.studentType === 'full_time' && !data.studentType)
            ) {
                return null;
            }
            const d = el.size * PT * 0.62;

            return (
                <div
                    style={{
                        position: 'absolute',
                        left: (el.x + el.w / 2) * MM - d / 2,
                        top: (el.y + el.h / 2) * MM - d / 2,
                        width: d,
                        height: d,
                        borderRadius: '50%',
                        background: el.color,
                    }}
                />
            );
        }
        case 'holderSignature':
            return (
                <Placed {...el}>
                    {signatures?.holder && (
                        <img
                            src={signatures.holder}
                            alt=""
                            draggable={false}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                            }}
                        />
                    )}
                </Placed>
            );
        case 'text':
        case 'field': {
            const text =
                el.kind === 'text' ? el.text : fieldValue(el.field, data);
            const value =
                el.kind === 'field' && el.prefix ? `${el.prefix}${text}` : text;
            const css: CSSProperties = {
                ...fontCss(el.font),
                color: el.color ?? '#000',
                background: el.bg ?? 'transparent',
                textAlign:
                    el.align === 'center'
                        ? 'center'
                        : el.align === 'right'
                          ? 'right'
                          : 'left',
                lineHeight: 1.18,
                whiteSpace: el.kind === 'text' ? 'pre-wrap' : 'nowrap',
                // like Crystal's "can grow": tall glyphs may pass the box edge
                overflow: el.kind === 'field' ? 'visible' : 'hidden',
            };
            const turned = el.rot % 180 !== 0;
            const maxWidth = (turned ? el.h : el.w) * MM;
            const size = (el.font?.size ?? 8) * PT;

            return (
                <Placed {...el} style={css}>
                    {el.kind === 'field' ? (
                        // single-line values shrink rather than overflow (long names)
                        <FitText max={maxWidth - 2} size={size} min={10}>
                            {value}
                        </FitText>
                    ) : (
                        <ShrinkText size={size}>{value}</ShrinkText>
                    )}
                </Placed>
            );
        }
    }
}

export function LegacyCard({
    spec,
    side,
    ...props
}: CardProps & { spec: LegacySpec; side: 'front' | 'back' }) {
    return (
        <Card innerRef={props.innerRef}>
            {spec[side].map((el, i) => (
                <Element key={i} el={el} props={props} />
            ))}
        </Card>
    );
}
