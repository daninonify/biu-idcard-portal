import { useEffect, useState } from 'react';
import type { CardPhoto } from '@/components/id-card';
import type { CardDetail } from '@/types/portal';

/** The saved photo of a card, with its natural size, ready for the templates. */
export function useCardPhoto(
    card: Pick<CardDetail, 'photo_url' | 'framing'>,
): CardPhoto | null {
    const [photo, setPhoto] = useState<CardPhoto | null>(null);

    useEffect(() => {
        if (!card.photo_url) {
            setPhoto(null);

            return;
        }
        let alive = true;
        const img = new Image();
        img.onload = () => {
            if (alive) {
                setPhoto({
                    url: card.photo_url!,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    head: card.framing?.head ?? { top: 0.08, cx: 0.5 },
                    background: card.framing?.background ?? '#ffffff',
                });
            }
        };
        img.src = card.photo_url;

        return () => {
            alive = false;
        };
    }, [card.photo_url, card.framing]);

    return photo;
}
