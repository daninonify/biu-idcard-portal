import type { Ref } from 'react';

/** Text printed on the card (same shape as CardPresenter::cardData). */
export type CardData = {
    surname: string | null;
    firstName: string | null;
    middleName: string | null;
    department: string | null;
    faculty: string | null;
    matric: string | null;
    programme: string | null;
    validUntil: string | null;
};

export type Head = { top: number; cx: number; found?: boolean };

/** A finished photo (background already replaced) and where the head is. */
export type CardPhoto = {
    url: string;
    width: number;
    height: number;
    head: Head;
    background: string;
};

/** Operator's framing tweaks on top of the automatic head framing. */
export type Adjust = { zoom: number; offX: number; offY: number };

export type Signatures = { registrar?: string | null };

export type CardProps = {
    data: CardData;
    photo: CardPhoto | null;
    adjust: Adjust;
    signatures?: Signatures;
    innerRef?: Ref<HTMLDivElement>;
};

export type TemplateKey = 'ug' | 'pg';

export const DEFAULT_ADJUST: Adjust = { zoom: 1, offX: 0, offY: 0 };

export const LOGOS = {
    light: '/brand/crest-light.png',
    navy: '/brand/crest-navy.png',
};
