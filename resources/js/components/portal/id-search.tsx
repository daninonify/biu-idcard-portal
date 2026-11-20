import { Form } from '@inertiajs/react';
import { ArrowRight, GraduationCap, IdCard, ScanSearch } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { store } from '@/routes/lookup';
import type { HolderType } from '@/types/portal';

const TYPES: {
    value: HolderType;
    label: string;
    icon: typeof GraduationCap;
    placeholder: string;
}[] = [
    {
        value: 'student',
        label: 'Student',
        icon: GraduationCap,
        placeholder: 'Matric number, e.g. SCN/CSC/230101',
    },
    {
        value: 'staff',
        label: 'Staff',
        icon: IdCard,
        placeholder: 'Staff number, e.g. BIU/AC/0150',
    },
];

/**
 * Student (matric no.) or Staff (staff no.) lookup. Pulls the person from the
 * student portal or the staff records and opens their card.
 */
export function IdSearch({
    autoFocus,
    size = 'default',
    defaultType = 'student',
    hints = {},
}: {
    autoFocus?: boolean;
    size?: 'default' | 'lg';
    defaultType?: HolderType;
    hints?: Partial<Record<HolderType, string[]>>;
}) {
    const [type, setType] = useState<HolderType>(defaultType);
    const big = size === 'lg';
    const current = TYPES.find((t) => t.value === type) ?? TYPES[0];
    const demo = hints[type] ?? [];

    return (
        <Form {...store.form()} className="w-full">
            {({ processing, errors }) => (
                <div className="space-y-2">
                    <input type="hidden" name="type" value={type} />
                    <div
                        className="inline-flex rounded-xl bg-muted p-1"
                        role="tablist"
                        aria-label="Who is the card for?"
                    >
                        {TYPES.map((t) => (
                            <button
                                key={t.value}
                                type="button"
                                role="tab"
                                aria-selected={type === t.value}
                                onClick={() => setType(t.value)}
                                className={cn(
                                    'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all',
                                    type === t.value
                                        ? 'bg-background text-navy-900 shadow-sm dark:text-white'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                <t.icon className="size-4" />
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <div
                        className={cn(
                            'flex items-center gap-2 rounded-2xl border bg-background p-1.5 shadow-sm transition-shadow focus-within:border-navy-400 focus-within:ring-4 focus-within:ring-navy-500/10',
                            errors.id_number && 'border-destructive',
                        )}
                    >
                        <ScanSearch
                            className={cn(
                                'ml-2.5 shrink-0 text-muted-foreground',
                                big ? 'size-6' : 'size-5',
                            )}
                        />
                        <input
                            key={type}
                            name="id_number"
                            autoFocus={autoFocus}
                            autoComplete="off"
                            spellCheck={false}
                            placeholder={current.placeholder}
                            className={cn(
                                'min-w-0 flex-1 bg-transparent font-semibold tracking-wide uppercase outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground/70 placeholder:normal-case',
                                big ? 'h-12 text-lg' : 'h-10 text-base',
                            )}
                        />
                        <Button
                            type="submit"
                            size={big ? 'lg' : 'default'}
                            disabled={processing}
                            className={cn(big && 'h-12 px-6')}
                        >
                            {processing ? <Spinner /> : <ArrowRight />}
                            Find {current.label.toLowerCase()}
                        </Button>
                    </div>
                    {errors.id_number && (
                        <p className="px-2 text-sm text-destructive">
                            {errors.id_number}
                        </p>
                    )}
                    {errors.type && (
                        <p className="px-2 text-sm text-destructive">
                            {errors.type}
                        </p>
                    )}
                    {demo.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 px-1 pt-1 text-xs text-muted-foreground">
                            <span>Demo {current.label.toLowerCase()}:</span>
                            {demo.map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={(e) => {
                                        const form = e.currentTarget.closest(
                                            'form',
                                        ) as HTMLFormElement;
                                        const input = form.elements.namedItem(
                                            'id_number',
                                        ) as HTMLInputElement;
                                        input.value = m;
                                        input.focus();
                                    }}
                                    className="rounded-md border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] hover:border-navy-300 hover:bg-navy-50 hover:text-navy-700"
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </Form>
    );
}
