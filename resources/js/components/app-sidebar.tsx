import { Link, usePage } from '@inertiajs/react';
import {
    Camera,
    FileSpreadsheet,
    History,
    ImageUp,
    LayoutDashboard,
    ListChecks,
    ScanSearch,
    Settings2,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import {
    cameraSettings,
    dashboard,
    dataFiles,
    lookup,
    portalPictures,
    records,
} from '@/routes';
import { edit as settingsEdit } from '@/routes/admin/settings';
import { index as usersIndex } from '@/routes/admin/users';
import { index as cardsIndex } from '@/routes/cards';

type Item = {
    title: string;
    href: string;
    icon: LucideIcon;
    badge?: number | null;
    match?: string;
};

type Shared = {
    auth: { user: { is_admin: boolean } | null };
    counts: { open: number; awaiting_portal: number } | null;
};

export function AppSidebar() {
    const { auth, counts } = usePage<Shared>().props;
    const { isCurrentUrl, currentUrl } = useCurrentUrl();

    const groups: { label: string; items: Item[] }[] = [
        {
            label: 'Capture desk',
            items: [
                {
                    title: 'Dashboard',
                    href: dashboard().url,
                    icon: LayoutDashboard,
                },
                {
                    title: 'Lookup',
                    href: lookup().url,
                    icon: ScanSearch,
                },
                {
                    title: 'Card status',
                    href: cardsIndex().url,
                    icon: ListChecks,
                    badge: counts?.open,
                    match: '/cards',
                },
                { title: 'Records', href: records().url, icon: History },
            ],
        },
        {
            label: 'Data',
            items: [
                {
                    title: 'Generate data files',
                    href: dataFiles().url,
                    icon: FileSpreadsheet,
                },
                {
                    title: 'Update portal pictures',
                    href: portalPictures().url,
                    icon: ImageUp,
                    badge: counts?.awaiting_portal,
                },
            ],
        },
        {
            label: 'Setup',
            items: [
                {
                    title: 'Camera settings',
                    href: cameraSettings().url,
                    icon: Camera,
                },
                ...(auth.user?.is_admin
                    ? [
                          {
                              title: 'User accounts',
                              href: usersIndex().url,
                              icon: Users,
                          },
                          {
                              title: 'Portal settings',
                              href: settingsEdit().url,
                              icon: Settings2,
                          },
                      ]
                    : []),
            ],
        },
    ];

    const active = (item: Item) =>
        isCurrentUrl(item.href) ||
        (item.match ? currentUrl.startsWith(item.match) : false);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="pb-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="hover:bg-sidebar-accent/60"
                        >
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {groups.map((g) => (
                    <SidebarGroup key={g.label} className="px-2 py-1">
                        <SidebarGroupLabel className="text-[10.5px] font-semibold tracking-[0.12em] text-sidebar-foreground/45 uppercase">
                            {g.label}
                        </SidebarGroupLabel>
                        <SidebarMenu>
                            {g.items.map((item) => {
                                const isActive = active(item);

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                            tooltip={{ children: item.title }}
                                            className="relative h-9 text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-white data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-white"
                                        >
                                            <Link href={item.href} prefetch>
                                                {isActive && (
                                                    <span className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r bg-sidebar-primary" />
                                                )}
                                                <item.icon
                                                    className={
                                                        isActive
                                                            ? 'text-sidebar-primary'
                                                            : ''
                                                    }
                                                />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                        {!!item.badge && (
                                            <SidebarMenuBadge className="rounded-full bg-sidebar-primary/90 px-1.5 text-[10.5px] font-bold text-sidebar-primary-foreground">
                                                {item.badge > 999
                                                    ? '999+'
                                                    : item.badge}
                                            </SidebarMenuBadge>
                                        )}
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter>
                <div className="mx-2 mb-1 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3 text-[11.5px] leading-snug text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
                    <span className="font-semibold text-sidebar-primary">
                        Private data.
                    </span>{' '}
                    Photos and records stay on this server. Sign out when you
                    leave the desk.
                </div>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
