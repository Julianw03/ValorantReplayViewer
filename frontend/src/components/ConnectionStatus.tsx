import { Wifi, WifiOff } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { usePlayerAlias } from '@/lib/queries.ts';

export function ConnectionStatus() {
    const wsConnected = useAppStore((s) => s.wsConnected);
    const playerAlias = usePlayerAlias();

    return (
        <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">
                    {playerAlias ? `${playerAlias.gameName}#${playerAlias.tagLine}` : 'Not signed in'}
                </p>
                <div className="mt-0.5 flex items-center gap-1">
                    {wsConnected ? (
                        <Wifi className="size-3 text-green-500" />
                    ) : (
                        <WifiOff className="size-3 text-muted-foreground" />
                    )}
                    <span className="text-xs text-muted-foreground">
            {wsConnected ? 'Connected' : 'Disconnected'}
          </span>
                </div>
            </div>
        </div>
    );
}
