import { useId } from 'react';
import {
    Barcode,
    Card,
    FitText,
    PhotoBox,
    Rotated,
    Swoosh,
    abs,
    namePG,
    nameUG,
} from './parts';
import { LOGOS } from './types';
import type { CardProps } from './types';

const LATO = 'Lato, "Segoe UI", Arial, sans-serif';
const SERIF = 'Cinzel, "Trajan Pro", Georgia, serif';
const NAVY = '#363f8c';
const GOLD = '#e3ae2f';
const PG_BLUE = '#4247b6';

/** Undergraduate student: white, gold side bar, vertical STUDENT. */
export function UndergradFront({ data, photo, adjust, innerRef }: CardProps) {
    const [line1, line2] = nameUG(data);
    const id = useId();

    return (
        <Card innerRef={innerRef}>
            <Swoosh left={140} id={`sw-${id}`} />
            <div
                style={{
                    ...abs(14, 22),
                    width: 24,
                    height: 806,
                    background: GOLD,
                    borderRadius: 3,
                }}
            />
            <img
                src={LOGOS.light}
                alt=""
                style={{
                    ...abs(44, 30),
                    width: 118,
                    height: 152,
                    objectFit: 'contain',
                }}
            />

            <div
                style={{
                    ...abs(undefined, 48),
                    right: 30,
                    textAlign: 'right',
                    color: NAVY,
                    fontFamily: LATO,
                }}
            >
                <div
                    style={{
                        fontWeight: 900,
                        fontSize: 31,
                        lineHeight: 1,
                        letterSpacing: -0.2,
                    }}
                >
                    BENSON IDAHOSA
                </div>
                <div
                    style={{
                        fontWeight: 300,
                        fontSize: 37,
                        lineHeight: 1,
                        letterSpacing: 1.5,
                    }}
                >
                    UNIVERSITY
                </div>
                <div
                    style={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.5 }}
                >
                    P.M.B. 1100 BENIN CITY, EDO STATE
                </div>
                <div
                    style={{
                        fontWeight: 400,
                        fontSize: 12,
                        marginTop: 12,
                        color: '#555',
                    }}
                >
                    www.biu.edu.ng
                </div>
            </div>

            <Rotated
                cx={120}
                cy={392}
                style={{
                    fontFamily: LATO,
                    fontWeight: 300,
                    fontSize: 74,
                    letterSpacing: 6,
                    color: '#4651a6',
                }}
            >
                STUDENT
            </Rotated>

            <PhotoBox
                photo={photo}
                adjust={adjust}
                x={203}
                y={182}
                w={302}
                h={410}
                border={`2px solid ${NAVY}`}
            />

            <div
                style={{
                    ...abs(undefined, 600),
                    right: 22,
                    textAlign: 'right',
                    color: NAVY,
                    fontFamily: LATO,
                    fontWeight: 900,
                    lineHeight: 1.22,
                }}
            >
                <div>
                    <FitText max={470} size={34}>
                        {line1}
                    </FitText>
                </div>
                <div>
                    <FitText max={470} size={34}>
                        {line2}
                    </FitText>
                </div>
            </div>
            <div
                style={{
                    ...abs(undefined, 686),
                    right: 22,
                    textAlign: 'right',
                    color: NAVY,
                    fontFamily: LATO,
                    fontSize: 16,
                    lineHeight: 1.4,
                }}
            >
                <div>
                    <FitText max={440} size={16}>
                        {(data.department || '').toUpperCase()}
                    </FitText>
                </div>
                <div>
                    <FitText max={440} size={16}>
                        {(data.faculty || '').toUpperCase()}
                    </FitText>
                </div>
            </div>

            <div
                style={{
                    ...abs(64, 752),
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: GOLD,
                }}
            />
            <div style={abs(236, 738)}>
                <Barcode
                    value={data.matric}
                    width={286}
                    height={60}
                    color="#1d2140"
                />
            </div>
            <div
                style={{
                    ...abs(undefined, 804),
                    right: 20,
                    fontFamily: LATO,
                    fontWeight: 900,
                    fontSize: 23,
                    color: '#1d1d24',
                    letterSpacing: 0.5,
                }}
            >
                {(data.matric || '').toUpperCase()}
            </div>
            <div
                style={{
                    ...abs(30, 844),
                    right: 0,
                    height: 12,
                    background: '#3b44a0',
                }}
            />
        </Card>
    );
}

/** Postgraduate student: serif header, blue name band. */
export function PostgradFront({ data, photo, adjust, innerRef }: CardProps) {
    const [line1, line2] = namePG(data);
    const id = useId();

    return (
        <Card innerRef={innerRef}>
            <Swoosh left={210} id={`sw-${id}`} />
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
                    background: '#3d42b0',
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
