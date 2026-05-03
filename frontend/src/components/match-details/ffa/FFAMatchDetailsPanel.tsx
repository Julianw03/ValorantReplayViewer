import type { MatchDetailsPanelProps, MinimalMatchPlayer } from '@/components/match-details/MatchDetailsPanel.tsx';
import { formatDate, formatDuration } from '@/components/saved-replays/formatters.ts';
import { cn } from '@/lib/utils.ts';

type LeaderboardRowProps = {
    player: MinimalMatchPlayer;
    rank: number;
    highlightPlayer?: string;
};

function LeaderboardRow({ player, rank, highlightPlayer }: LeaderboardRowProps) {
    const isActive = player.subject === highlightPlayer;

    return (
        <div
            className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1 text-xs',
                isActive
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                    : 'bg-muted/30',
            )}
        >
      <span
          className={cn(
              'w-5 shrink-0 text-center font-mono',
              isActive ? 'text-blue-300' : 'text-muted-foreground',
          )}
      >
        {rank}
      </span>

            <span className="flex-1 truncate">
        <span className={cn('font-medium', isActive && 'text-blue-300')}>
          {player.gameName}
        </span>
        <span className="text-muted-foreground">
          #{player.tagLine}
        </span>
      </span>

            <span
                className={cn(
                    'w-20 shrink-0 text-right font-mono',
                    isActive ? 'text-blue-300' : 'text-muted-foreground',
                )}
            >
        {player.stats.kills} / {player.stats.deaths} / {player.stats.assists}
      </span>
        </div>
    );
}

function Leaderboard({
                         players,
                         highlightPlayer,
                     }: {
    players: MinimalMatchPlayer[];
    highlightPlayer?: string;
}) {
    const ranked = [...players].sort(
        (a, b) => b.stats.kills - a.stats.kills,
    );

    return (
        <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                <span className="w-5 shrink-0 text-center">#</span>
                <span className="flex-1">Player</span>
                <span className="w-20 shrink-0 text-right font-mono">
          K / D / A
        </span>
            </div>

            {ranked.map((player, index) => (
                <LeaderboardRow
                    key={player.subject}
                    player={player}
                    rank={index + 1}
                    highlightPlayer={highlightPlayer}
                />
            ))}

            {players.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">
                    No players
                </p>
            )}
        </div>
    );
}

export const FFAMatchDetailsPanel = ({
                                         matchInfo,
                                         players,
                                         highlightPlayer,
                                     }: MatchDetailsPanelProps) => {
    const activePlayers = players.filter((p) => !p.isObserver);

    return (
        <div className="border-t border-border/50 px-4 pb-4 pt-3">
            <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>{formatDate(matchInfo.gameStartMillis)}</span>
                <span>·</span>
                <span>{formatDuration(matchInfo.gameLengthMillis)}</span>
            </div>
            <Leaderboard players={activePlayers} highlightPlayer={highlightPlayer} />
        </div>
    );
};
