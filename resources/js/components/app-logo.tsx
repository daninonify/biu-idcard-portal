import { usePage } from '@inertiajs/react';

export default function AppLogo() {
    const { institution } = usePage<{
        institution: { name: string; short: string };
    }>().props;

    return (
        <>
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white p-0.5 shadow-sm ring-1 ring-black/5">
                <img
                    src="/brand/crest-light.png"
                    alt=""
                    className="size-full object-contain"
                />
            </div>
            <div className="ml-1 grid flex-1 text-left leading-tight">
                <span className="truncate font-display text-[13px] font-bold tracking-wide text-white">
                    {institution?.short ?? 'BIU'} ID Cards
                </span>
                <span className="truncate text-[11px] text-sidebar-foreground/60">
                    {institution?.name}
                </span>
            </div>
        </>
    );
}
