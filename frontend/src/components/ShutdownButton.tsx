import { Loader2, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useShutdown } from '@/lib/queries';

interface ShutdownButtonProps {
    className?: string;
}

export function ShutdownButton({ className }: ShutdownButtonProps) {
    const { mutate: shutdown, isPending } = useShutdown();
    return (
        <ConfirmDialog
            title="Shut down VRV?"
            description="This will stop the VRV backend process. You will need to restart the application manually."
            confirmLabel="Shut down"
            onConfirm={() => shutdown()}
        >
            <Button variant="ghost" size="icon" disabled={isPending} className={className ?? 'h-7 w-7 text-muted-foreground hover:text-destructive'}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Power className="size-4" />}
            </Button>
        </ConfirmDialog>
    );
}
