import type { CSSProperties, ReactNode } from 'react';
import { Card, FitText, PhotoBox, abs } from './parts';
import { LOGOS } from './types';
import type { CardData, CardProps } from './types';

/*
 * Postgraduate card front, as printed today (none of the extracted Crystal
 * Reports templates matches it, so it was recreated from a printed card).
 */

const LATO = 'Lato, "Segoe UI", Arial, sans-serif';
const SERIF = 'Cinzel, "Trajan Pro", Georgia, serif';
const GOLD = '#e3ae2f';
const PG_BLUE = '#4247b6';

const initial = (s: string | null) =>
    s?.trim() ? `${s.trim()[0].toUpperCase()}.` : '';
const up = (s: string | null) => (s || '').trim().toUpperCase();

/** "SURNAME .M." / "FIRSTNAME", as on the printed cards */
const namePG = (d: CardData): [string, string] => [
    [up(d.surname), d.middleName?.trim() ? `.${initial(d.middleName)}` : '']
        .filter(Boolean)
        .join(' '),
    up(d.firstName),
];

function Rotated({
    cx,
    cy,
    style,
    children,
}: {
    cx: number;
    cy: number;
    style?: CSSProperties;
    children: ReactNode;
}) {
    return (
        <div
            style={{
                position: 'absolute',
                left: cx,
                top: cy,
                transform: 'translate(-50%, -50%) rotate(-90deg)',
                whiteSpace: 'nowrap',
                lineHeight: 1,
                ...style,
            }}
        >
            {children}
        </div>
    );
}

export function PostgradFront({ data, photo, adjust, innerRef }: CardProps) {
    const [line1, line2] = namePG(data);

    return (
        <Card innerRef={innerRef}>
            {/* gold ribbon from the old NewCard artwork */}
            <img
                src="/brand/legacy/ribbon.png"
                alt=""
                style={{ ...abs(196, 0), width: 344, height: 44 }}
            />
            <img
                src={LOGOS.light}
                alt=""
                style={{
                    ...abs(44, 36),
                    width: 100,
                    height: 130,
                    objectFit: 'contain',
                }}
            />

            <div
                style={{
                    ...abs(undefined, 40),
                    right: 32,
                    textAlign: 'right',
                    color: PG_BLUE,
                    fontFamily: SERIF,
                }}
            >
                <div
                    style={{ fontWeight: 600, fontSize: 29, lineHeight: 1.05 }}
                >
                    BENSON IDAHOSA
                </div>
                <div
                    style={{
                        fontWeight: 400,
                        fontSize: 25,
                        lineHeight: 1.05,
                        letterSpacing: 1,
                    }}
                >
                    UNIVERSITY
                </div>
                <div
                    style={{
                        fontWeight: 600,
                        fontSize: 10.5,
                        lineHeight: 1.7,
                        color: '#3c3f7a',
                    }}
                >
                    P.M.B. 1100 BENIN CITY, EDO STATE
                </div>
                <div
                    style={{ fontWeight: 600, fontSize: 8.5, color: '#3c3f7a' }}
                >
                    WWW.BIU.EDU.NG
                </div>
            </div>
            <div
                style={{
                    ...abs(undefined, 150),
                    right: 32,
                    fontFamily: SERIF,
                    fontWeight: 600,
                    fontSize: 13.5,
                    letterSpacing: 0.6,
                    color: PG_BLUE,
                }}
            >
                SCHOOL OF POSTGRADUATE STUDIES
            </div>
            <div
                style={{
                    ...abs(0, 180),
                    right: 0,
                    height: 14,
                    background: GOLD,
                }}
            />
            <div
                style={{
                    ...abs(0, 196),
                    right: 0,
                    height: 3,
                    background: '#3a3f8f',
                }}
            />

            <Rotated
                cx={54}
                cy={430}
                style={{
                    fontFamily: LATO,
                    fontWeight: 400,
                    fontSize: 58,
                    letterSpacing: 2,
                    color: '#4a55c4',
                }}
            >
                STUDENT
            </Rotated>

            <PhotoBox
                photo={photo}
                adjust={adjust}
                x={112}
                y={212}
                w={336}
                h={458}
                border="1.5px solid #2c2c3a"
            />

            <div
                style={{
                    ...abs(6, 676),
                    right: 6,
                    height: 90,
                    // split band, as printed: darker blue behind the surname line, lighter behind the first name
                    background:
                        'linear-gradient(to bottom, #3539a8 0 50%, #4f55c7 50% 100%)',
                    color: '#fff',
                    textAlign: 'center',
                    fontFamily: LATO,
                    fontWeight: 700,
                    lineHeight: 1.3,
                    paddingTop: 6,
                    boxSizing: 'border-box',
                }}
            >
                <div>
                    <FitText max={500} size={31}>
                        {line1}
                    </FitText>
                </div>
                <div>
                    <FitText max={500} size={31}>
                        {line2}
                    </FitText>
                </div>
            </div>
            <div
                style={{
                    ...abs(0, 776),
                    right: 0,
                    textAlign: 'center',
                    fontFamily: LATO,
                    fontSize: 15.5,
                    color: '#4f5bc4',
                    lineHeight: 1.45,
                }}
            >
                <div>
                    <FitText max={500} size={15.5}>
                        DEPARTMENT: {(data.department || '').toUpperCase()}
                    </FitText>
                </div>
                <div>MAT. NO: {(data.matric || '').toUpperCase()}</div>
            </div>
            <div
                style={{
                    ...abs(0, 824),
                    right: 0,
                    textAlign: 'center',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontWeight: 700,
                    fontSize: 15,
                    color: '#222',
                }}
            >
                ({(data.programme || '').toUpperCase()})
            </div>
        </Card>
    );
}
