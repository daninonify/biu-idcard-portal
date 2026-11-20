/** One element of an old Crystal Reports card layout. All lengths in mm. */
type Box = { x: number; y: number; w: number; h: number };

export type LegacyFont = {
    family: string;
    size: number;
    bold: boolean;
    italic: boolean;
};

type TextStyle = {
    /** Crystal Reports rotation: 90 = reads bottom-to-top, 270 = top-to-bottom */
    rot: number;
    align: string;
    font?: LegacyFont;
    color?: string;
    bg?: string;
};

export type LegacyField =
    | 'surname'
    | 'otherNames'
    | 'department'
    | 'programme'
    | 'matric'
    | 'faculty'
    | 'validUntil'
    | 'staffNo'
    | 'barcodeTitle';

export type LegacyElement =
    | (Box & { kind: 'image'; src: string })
    | (Box & { kind: 'box'; bg?: string })
    | (Box & { kind: 'photo'; border?: string })
    | (Box & { kind: 'barcode'; rot: number })
    | (Box & { kind: 'registrarSignature'; variant: 'a' | 'b' })
    | (Box & { kind: 'holderSignature' })
    | (Box & {
          kind: 'typeMarker';
          studentType: string;
          color: string;
          size: number;
      })
    | (Box & TextStyle & { kind: 'text'; text: string })
    | (Box &
          TextStyle & { kind: 'field'; field: LegacyField; prefix?: string });

export type LegacySpec = {
    label: string;
    source: string;
    width: number;
    height: number;
    front: LegacyElement[];
    back: LegacyElement[];
};
