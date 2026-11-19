import type { CSSProperties } from 'react';
import { Barcode, CARD_H, CARD_W, Card, abs } from './parts';
import type { CardProps } from './types';

const SANS = '"Segoe UI", "Open Sans", Lato, Arial, sans-serif';

function SignatureSlot({
    src,
    width,
    height,
    label,
    style,
}: {
    src?: string | null;
    width: number;
    height: number;
    label: string;
    style?: CSSProperties;
}) {
    return (
        <div style={{ width, ...style }}>
            <div
                style={{
                    height,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                }}
            >
                {src ? (
                    <img
                        src={src}
                        alt=""
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                        }}
                    />
                ) : (
                    <div
                        style={{
                            width: '80%',
                            borderBottom: '1.5px dashed #888',
                            marginBottom: 6,
                        }}
                    />
                )}
            </div>
            <div
                style={{
                    textAlign: 'center',
                    fontFamily: 'Lato, sans-serif',
                    fontSize: 15,
                    letterSpacing: 1,
                    color: '#333',
                    marginTop: 4,
                }}
            >
                {label}
            </div>
        </div>
    );
}

/** Student back: printed in landscape, so the content is a rotated 856 x 540 panel. */
export function StudentBack({ data, signatures, innerRef }: CardProps) {
    return (
        <Card innerRef={innerRef}>
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: CARD_H,
                    height: CARD_W,
                    transform: `translate(${CARD_W}px, 0) rotate(90deg)`,
                    transformOrigin: 'top left',
                    fontFamily: SANS,
                    color: '#111',
                }}
            >
                <div
                    style={{
                        ...abs(40, 34),
                        fontWeight: 800,
                        fontSize: 21,
                        letterSpacing: 0.4,
                    }}
                >
                    VALID UNTIL: {data.validUntil}
                </div>
                <div
                    style={{
                        ...abs(0, 34),
                        right: 40,
                        textAlign: 'right',
                        fontWeight: 600,
                        fontSize: 21,
                        letterSpacing: 0.5,
                    }}
                >
                    THIS CARD IS NOT TRANSFERABLE
                </div>
                <div
                    style={{
                        ...abs(60, 84),
                        right: 60,
                        textAlign: 'center',
                        fontWeight: 600,
                        fontSize: 21.5,
                        lineHeight: 1.32,
                    }}
                >
                    This is your official Benson Idahosa University
                    Identification Card. It is a PROPERTY OF THE UNIVERSITY. Its
                    usage is governed by all University Regulations. It
                    certifies that the person whose photograph and name appears
                    on it is a student of this institution.
                    <div style={{ marginTop: 6 }}>
                        Please if found return to:
                    </div>
                    <div>
                        The Office of the Registrar, Benson Idahosa University,
                    </div>
                    <div>Ugbor, G.R.A., Benin City, Nigeria</div>
                </div>
                <div style={abs(54, 392)}>
                    <Barcode
                        value={data.matric}
                        width={560}
                        height={92}
                        color="#111"
                    />
                </div>
                <SignatureSlot
                    src={signatures?.registrar}
                    width={190}
                    height={92}
                    label="REGISTRAR'S SIGNATURE"
                    style={abs(632, 388)}
                />
            </div>
        </Card>
    );
}
