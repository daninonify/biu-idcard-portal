import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';
import { LegacyCard, legacyKeyFor } from './legacy/legacy-card';
import { LEGACY_SPECS } from './legacy/specs';
import { CARD_H, CARD_W } from './parts';
import { PostgradFront } from './pg-front';
import type { CardProps, TemplateKey } from './types';

export { CARD_H, CARD_W } from './parts';
export * from './types';

/**
 * The card designs as printed by the former ID card portal:
 *  - undergraduate: NewCard.rpt (both sides), with the student-type dot;
 *  - postgraduate:  its own front (pg-front.tsx) and the NewCard back;
 *  - staff:         StaffCard2016.rpt.
 * The .rpt designs are generated from their layouts into legacy/specs.ts.
 */
function sides(template: TemplateKey): {
    Front: ComponentType<CardProps>;
    Back: ComponentType<CardProps>;
} {
    const spec = LEGACY_SPECS[legacyKeyFor(template)];

    return {
        Front:
            template === 'pg'
                ? PostgradFront
                : (p: CardProps) => (
                      <LegacyCard {...p} spec={spec} side="front" />
                  ),
        Back: (p: CardProps) => <LegacyCard {...p} spec={spec} side="back" />,
    };
}

export const TEMPLATES: Record<
    TemplateKey,
    {
        label: string;
        Front: ComponentType<CardProps>;
        Back: ComponentType<CardProps>;
    }
> = {
    ug: { label: 'Undergraduate', ...sides('ug') },
    pg: { label: 'Postgraduate', ...sides('pg') },
    staff: { label: 'Staff', ...sides('staff') },
};

/**
 * A card drawn at full export size and shown scaled down. The inner node
 * keeps its true 540 x 856 size so printing stays pixel exact.
 */
export function ScaledCard({
    scale,
    className,
    children,
}: {
    scale: number;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div
            className={cn(
                'overflow-hidden rounded-[14px] shadow-[0_10px_30px_-8px_rgba(20,24,70,0.35),0_0_0_1px_rgba(20,24,70,0.08)]',
                className,
            )}
            style={{ width: CARD_W * scale, height: CARD_H * scale }}
        >
            <div
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    width: CARD_W,
                    height: CARD_H,
                }}
            >
                {children}
            </div>
        </div>
    );
}
