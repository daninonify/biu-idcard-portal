import type { CardData } from '@/components/id-card';

export type CardStatus = 'pending' | 'captured' | 'printed';

/** A row in card lists (CardPresenter::row). */
export type CardRow = {
    id: number;
    matric_no: string;
    full_name: string;
    phone: string | null;
    faculty: string | null;
    department: string | null;
    student_type_label: string | null;
    template_label: string;
    status: CardStatus;
    status_label: string;
    print_count: number;
    thumb_url: string | null;
    portal_photo_synced_at: string | null;
    captured_at: string | null;
    updated_at: string | null;
};

export type Framing = {
    zoom: number;
    offX: number;
    offY: number;
    head: { top: number; cx: number; found?: boolean };
    background: string;
};

export type CardDetail = {
    id: number;
    session: string;
    template: 'ug' | 'pg';
    template_label: string;
    status: CardStatus;
    status_label: string;
    valid_until: string | null;
    has_photo: boolean;
    photo_url: string | null;
    photo_engine: string | null;
    photo_engine_label: string | null;
    framing: Framing | null;
    captured_at: string | null;
    captured_by: string | null;
    printed_at: string | null;
    printed_by: string | null;
    print_count: number;
    encoded_at: string | null;
    portal_photo_synced_at: string | null;
    notes: string | null;
    created_at: string | null;
    updated_at: string | null;
};

export type StudentDetail = {
    id: number;
    matric_no: string;
    full_name: string;
    surname: string;
    first_name: string;
    middle_name: string | null;
    email: string | null;
    phone: string | null;
    date_of_birth: string | null;
    sex: string | null;
    country: string | null;
    state: string | null;
    lga: string | null;
    address: string | null;
    faculty: string | null;
    department: string | null;
    programme: string | null;
    level: string | null;
    student_type: string | null;
    student_type_label: string | null;
    graduation_year: string | null;
    guardian_name: string | null;
    guardian_phone: string | null;
    guardian_address: string | null;
    portal_synced_at: string | null;
};

export type EventRow = {
    id: number;
    action: string;
    description: string | null;
    matric_no: string | null;
    card_id: number | null;
    student_name: string | null;
    user: string | null;
    ip_address: string | null;
    created_at: string | null;
};

export type Option = { value: string; label: string };

export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
    prev_page_url: string | null;
    next_page_url: string | null;
};

export type { CardData };
