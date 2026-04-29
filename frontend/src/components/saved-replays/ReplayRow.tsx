import { useState } from 'react';
import { ChevronLeft, Download, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDeleteMatch } from '@/lib/queries';
import type { ReplayMetadata } from '@/lib/api';
import { API_BASE } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { mapDisplayName, truncateId } from './formatters';
import { useAppStore } from '@/store/useAppStore';
import {
    MatchDetailsPanel,
    type MinimalMatchInfo,
    type MinimalMatchPlayer,
    type MinimalMatchTeam,
} from '@/components/match-details/MatchDetailsPanel.tsx';
import { InjectButton } from '@/components/saved-replays/InjectButton.tsx';

// Shared grid layout — applied to both the header row and each replay row so
// columns are always aligned. Columns:  queue | map | version | stored | actions
export const GRID_COLS = '6rem 1fr 10rem 10rem 8rem' as const;

const ReplayRowButtons = {
    INJECT: 'inject',
    DOWNLOAD: 'download',
    DELETE: 'delete',
} as const;

export type ReplayRowButtons = typeof ReplayRowButtons[keyof typeof ReplayRowButtons];

interface ReplayRowProps {
    replay: ReplayMetadata;
    shownButtons?: ReplayRowButtons[];
}

const renderPanel = (replay: ReplayMetadata) => {
    const minimalMatchInfo: MinimalMatchInfo = {
        matchId: replay.matchInfo.matchId,
        mapId: replay.matchInfo.mapId,
        queueID: replay.matchInfo.queueID,
        gameVersion: replay.matchInfo.gameVersion,
        gameLengthMillis: replay.matchInfo.gameLengthMillis,
        gameStartMillis: replay.matchInfo.gameStartMillis,
        isRanked: replay.matchInfo.isRanked,
    };

    const minimalTeams: MinimalMatchTeam[] = replay.teams.map(team => ({
        teamId: team.teamId,
        won: team.won,
        roundsPlayed: team.roundsPlayed,
        roundsWon: team.roundsWon,
    }));

    const minimalPlayers: MinimalMatchPlayer[] = replay.players.map(player => ({
        subject: player.puuid,
        gameName: player.gameName,
        tagLine: player.tagLine,
        teamId: player.teamId,
        characterId: player.characterId,
        isObserver: player.isObserver,
        stats: {
            kills: player.kills,
            deaths: player.deaths,
            assists: player.assists,
        },
    }));

    return (
        <MatchDetailsPanel teams={minimalTeams} players={minimalPlayers} matchInfo={minimalMatchInfo}
                           highlightPlayer={replay.downloadInfo.downloaderId
                           } />
    );

};

export function ReplayRow({ replay, shownButtons = Object.values(ReplayRowButtons) }: ReplayRowProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { mutate: deleteMatch, isPending: isDeleting } = useDeleteMatch();
    const storedAt = useRelativeTime(replay.downloadInfo.downloadedAt);
    const mapAsset = useAppStore((s) => s.mapRegistry?.[replay.matchInfo.mapId] ?? null);

    const {
        gameName,
        tagLine,
    } = replay.players.find(f => f.puuid === replay.downloadInfo.downloaderId) ?? {
        gameName: 'Unknown',
        tagLine: '?',
    };
    const downloadHref = `${API_BASE}/plugins/replay/storage/matches/${replay.matchInfo.matchId}`;

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="rounded-lg border border-border/50 bg-card overflow-hidden"
        >
            {/* Summary row */}
            <div
                className="relative isolate grid items-center gap-3 px-4 py-5 text-sm"
                style={{ gridTemplateColumns: GRID_COLS }}
            >
                {/* Map splash background — fades in from 50% to 100% on the right */}
                {mapAsset?.splash && (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 -z-10"
                        style={{
                            backgroundImage: `url(${mapAsset.splash})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center left',
                            maskImage: 'linear-gradient(to right, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)',
                        }}
                    />
                )}
                <div>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                        {replay.matchInfo.queueID || 'Unknown'}
                    </span>
                </div>
                <div className="truncate text-xs text-muted-foreground"
                     title={mapAsset?.displayName ?? replay.matchInfo.mapId}>
                    {mapAsset?.displayName ?? mapDisplayName(replay.matchInfo.mapId)}
                </div>
                <div className="text-xs text-muted-foreground">
                    <span className="font-medium">{gameName}</span>
                    <span className="text-muted-foreground">#{tagLine}</span>
                </div>
                <div className="text-xs text-muted-foreground"
                     title={new Date(replay.downloadInfo.downloadedAt).toLocaleString()}>
                    {storedAt}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                    {shownButtons.includes(ReplayRowButtons.INJECT) && <InjectButton replay={replay} />}
                    {shownButtons.includes(ReplayRowButtons.DOWNLOAD) && (
                        <Button size="icon-sm" variant="ghost" title="Download .vrp file" asChild>
                            <a href={downloadHref} download={`${replay.matchInfo.matchId}.vrp`}>
                                <Download />
                            </a>
                        </Button>
                    )}
                    {shownButtons.includes(ReplayRowButtons.DELETE) && (
                        <ConfirmDialog
                            title="Delete replay?"
                            description={<>
                                This will permanently delete the replay for match{' '}
                                <span className="font-mono">{truncateId(replay.matchInfo.matchId)}</span>.
                                This action cannot be undone.
                            </>}
                            confirmLabel="Delete"
                            onConfirm={() => deleteMatch(replay.matchInfo.matchId)}
                        >
                            <Button
                                size="icon-sm"
                                variant="ghost"
                                title="Delete replay"
                                disabled={isDeleting}
                                className="text-muted-foreground hover:text-destructive"
                            >
                                {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                            </Button>
                        </ConfirmDialog>
                    )}
                    <CollapsibleTrigger asChild>
                        <Button size="icon-sm" variant="ghost" title="Show match details">
                            <ChevronLeft className={cn('transition-transform duration-150', isOpen && '-rotate-90')} />
                        </Button>
                    </CollapsibleTrigger>
                </div>
            </div>

            {/* Expanded details */}
            <CollapsibleContent>
                {
                    renderPanel(replay)
                }
            </CollapsibleContent>
        </Collapsible>
    );
}
