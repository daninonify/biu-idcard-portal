import type { Auth } from '@/types/auth';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            institution: { name: string; short: string };
            auth: Auth;
            counts: { open: number; awaiting_portal: number } | null;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
