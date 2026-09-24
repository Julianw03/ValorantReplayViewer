import { useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecentMatches } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { GRID_COLS, MatchRow } from '@/components/recent-matches/MatchRow';

export function RecentMatchesPage() {
    const {
        data,
        isLoading,
        isError,
        error,
        refetch,
        isFetching,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useRecentMatches();

    const matches = data?.pages.flat() ?? [];
    const { ref: loadMoreRef, inView: loadMoreInView } = useInView({ rootMargin: '200px' });

    const wasInViewRef = useRef(false);

    useEffect(() => {
        const justEnteredView = loadMoreInView && !wasInViewRef.current;
        wasInViewRef.current = loadMoreInView;

        if (justEnteredView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [loadMoreInView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {matches.length > 0 ? `${matches.length} matches loaded` : 'No matches loaded'}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                    <RefreshCw className={cn(isFetching && 'animate-spin')} />
                    Refresh
                </Button>
            </div>

            {isError && (
                <div
                    className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    {error instanceof Error ? error.message : 'Failed to fetch matches'}
                </div>
            )}

            {isLoading ? (
                <div className="flex flex-col gap-2">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                </div>
            ) : matches.length === 0 && !isError ? (
                <div
                    className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
                    <p className="text-sm text-muted-foreground">No recent matches found.</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Make sure VALORANT is running and you're signed in.
                    </p>
                </div>
            ) : matches.length > 0 ? (
                <div className="flex flex-col gap-2">
                    {/* Column header */}
                    <div
                        className="grid items-center gap-3 px-4 text-xs font-medium text-muted-foreground"
                        style={{ gridTemplateColumns: GRID_COLS }}
                    >
                        <div>Queue</div>
                        <div>Map</div>
                        <div>Date</div>
                        <div>Compatibility</div>
                        <div>Actions</div>
                    </div>
                    {matches.map((match) => (
                        <MatchRow key={match.matchMetadata.matchInfo.matchId} match={match.matchMetadata} />
                    ))}
                </div>
            ) : null}

            {!isLoading && !isError && matches.length > 0 && (
                <div ref={loadMoreRef} className="flex justify-center">
                    {hasNextPage ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchNextPage()}
                            disabled={isFetchingNextPage}
                        >
                            {isFetchingNextPage && <Loader2 className="animate-spin" />}
                            Load older matches
                        </Button>
                    ) : (
                        <p className="text-xs text-muted-foreground">No more matches.</p>
                    )}
                </div>
            )}
        </div>
    );
}
