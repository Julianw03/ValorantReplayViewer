import { useState } from 'react';
import { BugPlay, ChevronDown, Clock, HardDrive, Loader2, Power, Settings, Zap } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem, SidebarRail,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { useShutdown } from '@/lib/queries';

function ShutdownButton() {
    const { mutate: shutdown, isPending } = useShutdown();
    return (
        <ConfirmDialog
            title="Shut down VRV?"
            description="This will stop the VRV backend process. You will need to restart the application manually."
            confirmLabel="Shut down"
            onConfirm={() => shutdown()}
        >
            <Button variant="ghost" size="icon" disabled={isPending} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Power className="size-4" />}
            </Button>
        </ConfirmDialog>
    );
}

const replayNavItems = [
    { title: 'Saved Replays', path: '/saved', icon: HardDrive },
    { title: 'Recent Matches', path: '/recent', icon: Clock },
    { title: 'Injector', path: '/injector', icon: BugPlay },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const [replayOpen, setReplayOpen] = useState(true);
    const [toolsOpen, setToolsOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <Sidebar variant="inset" {...props}>
            <SidebarHeader>
                <div className="flex items-center gap-2.5 px-2 py-1.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                        <Zap className="size-4 text-primary-foreground" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold leading-none">VRV</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Replay Viewer</p>
                    </div>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <Collapsible open={replayOpen} onOpenChange={setReplayOpen}>
                    <SidebarGroup>
                        <SidebarGroupLabel asChild>
                            <CollapsibleTrigger className="flex w-full items-center justify-between">
                                Replay Management
                                <ChevronDown
                                    className={cn(
                                        'size-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
                                        replayOpen && 'rotate-180',
                                    )}
                                />
                            </CollapsibleTrigger>
                        </SidebarGroupLabel>
                        <CollapsibleContent>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {replayNavItems.map((item) => (
                                        <SidebarMenuItem key={item.path}>
                                            <SidebarMenuButton
                                                isActive={location.pathname === item.path}
                                                onClick={() => navigate(item.path)}
                                                tooltip={item.title}
                                            >
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </CollapsibleContent>
                    </SidebarGroup>
                </Collapsible>

                <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
                    <SidebarGroup>
                        <SidebarGroupLabel asChild>
                            <CollapsibleTrigger className="flex w-full items-center justify-between">
                                Settings
                                <ChevronDown
                                    className={cn(
                                        'size-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
                                        toolsOpen && 'rotate-180',
                                    )}
                                />
                            </CollapsibleTrigger>
                        </SidebarGroupLabel>
                        <CollapsibleContent>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            isActive={location.pathname === '/config'}
                                            onClick={() => navigate('/config')}
                                            tooltip="Configuration"
                                        >
                                            <Settings />
                                            <span>Configuration</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </CollapsibleContent>

                    </SidebarGroup>
                </Collapsible>
            </SidebarContent>
            <SidebarRail />
            <SidebarFooter>
                <div className="flex items-center justify-between">
                    <ConnectionStatus />
                    <ShutdownButton />
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
