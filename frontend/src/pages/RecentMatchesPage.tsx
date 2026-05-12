import { useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { RECENT_MATCHES_PAGE_SIZE, useRecentMatches } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { MatchRow, GRID_COLS } from '@/components/recent-matches/MatchRow'

export function RecentMatchesPage() {
  const [page, setPage] = useState(0)
  const offset = page * RECENT_MATCHES_PAGE_SIZE

  const { data: matches = [], isLoading, isError, error, refetch, isFetching } =
    useRecentMatches(offset)

  const hasNextPage = matches.length === RECENT_MATCHES_PAGE_SIZE

  function handleRefresh() {
    setPage(0)
    refetch()
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {matches.length > 0 ? `Page ${page + 1}` : 'No matches loaded'}
        </p>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
          <RefreshCw className={cn(isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {isError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
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
            <div />
          </div>
          {matches.map((match) => (
            <MatchRow key={match.MatchID} match={match} />
          ))}
        </div>
      ) : null}

      {!isLoading && !isError && (page > 0 || hasNextPage) && (
        <Pagination className="mt-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => p - 1)}
                className={cn(page === 0 || isFetching ? 'pointer-events-none opacity-50' : '')}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink isActive>{page + 1}</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => p + 1)}
                className={cn(!hasNextPage || isFetching ? 'pointer-events-none opacity-50' : '')}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
