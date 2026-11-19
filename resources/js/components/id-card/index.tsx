import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';
import { StudentBack } from './backs';
import { PostgradFront, UndergradFront } from './fronts';
import { CARD_H, CARD_W } from './parts';
import type { CardProps, TemplateKey } from './types';

export { CARD_H, CARD_W } from './parts';
export * from './types';

export const TEMPLATES: Record<
    TemplateKey,
    {
        label: string;
        Front: ComponentType<CardProps>;
        Back: ComponentType<CardProps>;
    }
> = {
    ug: { label: 'Undergraduate', Front: UndergradFront, Back: StudentBack },
    pg: { label: 'Postgraduate', Front: PostgradFront, Back: StudentBack },
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
