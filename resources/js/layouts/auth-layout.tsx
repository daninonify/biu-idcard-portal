import { usePage } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import { DEFAULT_ADJUST, ScaledCard, TEMPLATES } from '@/components/id-card';
import type { CardData } from '@/components/id-card';

const SAMPLE: CardData = {
    surname: 'Sample',
    firstName: 'Student',
    middleName: 'Name',
    department: 'Computer Science',
    faculty: 'Basic and Applied Sciences',
    matric: 'SCN/CSC/260001',
    programme: 'B.Sc',
    validUntil: '2030',
};

/** Staff sign-in: brand panel on the left, form on the right. */
export default function AuthLayout({
    title = '',
    description = '',
    children,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
}) {
    const { institution } = usePage().props;
    const Front = TEMPLATES.ug.Front;

    return (
        <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
            {/* brand panel */}
            <div className="brand-pattern relative hidden overflow-hidden bg-navy-900 text-white lg:flex lg:flex-col">
                <div className="absolute -top-40 -left-32 size-[520px] rounded-full bg-gold-400/20 blur-3xl" />
                <div className="absolute -right-40 -bottom-48 size-[560px] rounded-full bg-navy-500/40 blur-3xl" />
                <svg
                    className="absolute top-0 left-0 w-full"
                    viewBox="0 0 800 120"
                    preserveAspectRatio="none"
                    aria-hidden
                >
                    <path
                        d="M0 10 C 260 110, 520 110, 800 20 L800 0 L0 0 Z"
                        fill="oklch(0.8 0.16 80 / 0.9)"
                    />
                    <path
                        d="M0 30 C 260 130, 540 120, 800 40"
                        stroke="oklch(0.85 0.15 84 / 0.6)"
                        strokeWidth="3"
                        fill="none"
                    />
                </svg>

                <div className="relative z-10 flex items-center gap-3 px-12 pt-28">
                    <div className="grid size-14 place-items-center rounded-2xl bg-white p-1 shadow-lg">
                        <img
                            src="/brand/crest-light.png"
                            alt=""
                            className="size-full object-contain"
                        />
                    </div>
                    <div>
                        <div className="font-display text-xl font-bold tracking-wide">
                            {institution.name}
                        </div>
                        <div className="text-sm text-white/60">
                            Identity Card Portal
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex flex-1 items-center gap-10 px-12 py-10">
                    <div className="max-w-sm space-y-5">
                        <h2 className="text-[34px] leading-[1.1] font-bold tracking-tight">
                            Capture, frame and print student ID cards
                            <span className="text-gold-300"> in minutes.</span>
                        </h2>
                        <p className="text-white/70">
                            Look a student up by matric number, take their
                            photo, and send a print-ready card straight to the
                            card printer.
                        </p>
                        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 backdrop-blur">
                            <ShieldCheck className="size-5 shrink-0 text-gold-300" />
                            Photos and records never leave the university
                            server.
                        </div>
                    </div>
                    <div className="hidden shrink-0 rotate-[4deg] xl:block">
                        <ScaledCard
                            scale={0.42}
                            className="shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)]"
                        >
                            <Front
                                data={SAMPLE}
                                photo={null}
                                adjust={DEFAULT_ADJUST}
                            />
                        </ScaledCard>
                    </div>
                </div>

                <div className="relative z-10 px-12 pb-8 text-xs text-white/40">
                    Authorised staff only · Activity is recorded
                </div>
            </div>

            {/* form */}
            <div className="brand-wash flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-sm">
                    <div className="mb-8 flex items-center gap-3 lg:hidden">
                        <img
                            src="/brand/crest-light.png"
                            alt=""
                            className="size-12 object-contain"
                        />
                        <div className="font-display text-lg font-bold text-navy-900 dark:text-white">
                            {institution.name}
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-navy-900 dark:text-white">
                        {title}
                    </h1>
                    {description && (
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            {description}
                        </p>
                    )}
                    <div className="mt-8">{children}</div>
                </div>
            </div>
        </div>
    );
}
