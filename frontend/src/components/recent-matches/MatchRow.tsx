import { useState } from 'react';
import { CheckCircle2, ChevronLeft, Download, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useDownloadStateFlags, useRetryDownload, useTriggerDownload } from '@/lib/queries';
import { cn } from '@/lib/utils';
import type { MatchHistoryEntry } from '@/lib/api';
import { mapDisplayName } from '@/components/saved-replays/formatters';
import { MatchStatsPanel } from './MatchStatsPanel';
import { useAppStore } from '@/store/useAppStore';
import { useRelativeTime } from '@/hooks/useRelativeTime.ts';

// Shared grid layout: queue | map | date | actions
export const GRID_COLS = '7rem 6rem 1fr 8rem' as const;

function formatDate(millis: number): string {
    return new Date(millis).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

interface DownloadButtonProps {
    canDownload: boolean;
    isDownloading: boolean;
    isFailed: boolean;
    isDownloaded: boolean;
    onDownload: () => void;
    onRetry: () => void;
}

function DownloadButton({
                            isDownloading,
                            isFailed,
                            isDownloaded,
                            onDownload,
                            onRetry,
                        }: DownloadButtonProps) {

    if (isDownloading) {
        return (
            <Button size="icon-sm" variant="ghost" disabled title="Downloading…">
                <Loader2 className="animate-spin" />
            </Button>
        );
    }

    if (isDownloaded) {
        return (
            <span className="flex items-center justify-center size-7 text-green-500" title="Saved">
                <CheckCircle2 className="size-4" />
            </span>
        );
    }

    if (isFailed) {
        return (
            <Button size="icon-sm" variant="ghost" title="Retry download" onClick={onRetry}>
                <XCircle className="size-4 text-destructive" />
            </Button>
        );
    }
    return (
        <Button
            size="icon-sm"
            variant="ghost"
            title="Download replay"
            onClick={onDownload}
        >
            <Download />
        </Button>
    );
}

interface MatchRowProps {
    match: MatchHistoryEntry;
}

export function MatchRow({ match }: MatchRowProps) {
    const [isOpen, setIsOpen] = useState(false);

    const { canDownload, isDownloading, isFailed, isDownloaded } =
        useDownloadStateFlags(match.MatchID);

    const { mutate: triggerDownload } = useTriggerDownload();
    const { mutate: retryDownload } = useRetryDownload();
    const relativeTime = useRelativeTime(match.GameStartTime);

    const matchStats = useAppStore((s) => s.matchStatsCache?.[match.MatchID]);
    const mapId = matchStats?.type === 'SUCCESS' ? matchStats.data.matchInfo.mapId : null;
    const mapAsset = useAppStore((s) => (mapId ? s.mapRegistry?.[mapId] ?? null : null));

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="rounded-lg border border-border/50 bg-card overflow-hidden"
        >
            <div
                className="relative isolate grid items-center gap-3 px-4 py-5 text-sm"
                style={{ gridTemplateColumns: GRID_COLS }}
            >
                {mapAsset?.splash && (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 -z-10"
                        style={{
                            backgroundImage: `url(${mapAsset.splash})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center center',
                            maskImage:
                                'linear-gradient(to right, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)',
                            WebkitMaskImage:
                                'linear-gradient(to right, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)',
                        }}
                    />
                )}

                <div>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                        {match.QueueID || 'Unknown'}
                    </span>
                </div>

                <div
                    className="text-xs text-muted-foreground truncate"
                    title={mapAsset?.displayName ?? mapId ?? undefined}
                >
                    {mapId ? (mapAsset?.displayName ?? mapDisplayName(mapId)) : '—'}
                </div>

                <div className="text-xs text-muted-foreground">
                    {formatDate(match.GameStartTime)} · {relativeTime}
                </div>

                <div className="flex items-center justify-end gap-1">
                    <DownloadButton
                        canDownload={canDownload}
                        isDownloading={isDownloading}
                        isFailed={isFailed}
                        isDownloaded={isDownloaded}
                        onDownload={() => triggerDownload(match.MatchID)}
                        onRetry={() => retryDownload(match.MatchID)}
                    />
                    <CollapsibleTrigger asChild>
                        <Button size="icon-sm" variant="ghost" title="Show match details">
                            <ChevronLeft
                                className={cn(
                                    'transition-transform duration-150',
                                    isOpen && '-rotate-90',
                                )}
                            />
                        </Button>
                    </CollapsibleTrigger>
                </div>
            </div>

            <CollapsibleContent>
                {isOpen && <MatchStatsPanel matchId={match.MatchID} />}
            </CollapsibleContent>
        </Collapsible>
    );
}