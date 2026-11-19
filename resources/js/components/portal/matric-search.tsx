import { Form } from '@inertiajs/react';
import { ArrowRight, ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { store } from '@/routes/lookup';

/** Matric number box that pulls the student from the portal and opens their card. */
export function MatricSearch({
    autoFocus,
    size = 'default',
    hints = [],
}: {
    autoFocus?: boolean;
    size?: 'default' | 'lg';
    hints?: string[];
}) {
    const big = size === 'lg';

    return (
        <Form {...store.form()} className="w-full">
            {({ processing, errors }) => (
                <div className="space-y-2">
                    <div
                        className={cn(
                            'flex items-center gap-2 rounded-2xl border bg-background p-1.5 shadow-sm transition-shadow focus-within:border-navy-400 focus-within:ring-4 focus-within:ring-navy-500/10',
                            errors.matric_no && 'border-destructive',
                        )}
                    >
                        <ScanSearch
                            className={cn(
                                'ml-2.5 shrink-0 text-muted-foreground',
                                big ? 'size-6' : 'size-5',
                            )}
                        />
                        <input
                            name="matric_no"
                            autoFocus={autoFocus}
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="Matric number, e.g. SCN/CSC/230101"
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
                            Find student
                        </Button>
                    </div>
                    {errors.matric_no && (
                        <p className="px-2 text-sm text-destructive">
                            {errors.matric_no}
                        </p>
                    )}
                    {hints.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 px-1 pt-1 text-xs text-muted-foreground">
                            <span>Demo students:</span>
                            {hints.map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={(e) => {
                                        const input = (
                                            e.currentTarget.closest(
                                                'form',
                                            ) as HTMLFormElement
                                        ).elements.namedItem(
                                            'matric_no',
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
