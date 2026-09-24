import { useState } from 'react';
import { AlertCircle, Package, RefreshCw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { queryKeys, useStorageStatus, useStoredMatches } from '@/lib/queries';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { StorageCard } from '@/components/saved-replays/StorageCard';
import { UploadReplayDialog } from '@/components/saved-replays/UploadReplayDialog';
import { ReplayEntry, type ReplayRowButton, ReplayRowButtons } from '@/components/saved-replays/ReplayEntry.tsx';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';

function pageWindow(current: number, total: number): (number | 'ellipsis')[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const wanted = [1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total);
    const sorted = [...new Set(wanted)].sort((a, b) => a - b);
    const out: (number | 'ellipsis')[] = [];
    let prev = 0;
    for (const p of sorted) {
        if (p - prev > 1) out.push('ellipsis');
        out.push(p);
        prev = p;
    }
    return out;
}

export function SavedReplaysPage() {
    const queryClient = useQueryClient();
    const { data: storageStatus } = useStorageStatus();
    const [page, setPage] = useState(1);
    const { data, isLoading, isFetching, isPlaceholderData } = useStoredMatches(page);

    if (data && data.totalPages > 0 && page > data.totalPages) {
        setPage(data.totalPages);
    }

    const isSetup = storageStatus?.isSetup ?? false;
    const storedMatches = data?.data ?? [];
    const total = data?.total ?? 0;
    const totalPages = data?.totalPages ?? 1;

    function handleRefresh() {
        queryClient.invalidateQueries({ queryKey: queryKeys.storageStatus });
        queryClient.invalidateQueries({ queryKey: ['storedMatches'] });
    }

    return (
        <div className="flex flex-col gap-4">
            <StorageCard />

            {!isSetup && storageStatus && (
                <div
                    className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                    <AlertCircle className="size-4 shrink-0" />
                    Initialize storage above to start saving and managing replays.
                </div>
            )}

            {isSetup && (
                <>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {total > 0
                                ? `${total} ${total === 1 ? 'replay' : 'replays'}`
                                : 'No replays stored'}
                        </p>
                        <div className="flex items-center gap-2">
                            <UploadReplayDialog>
                                <Button variant="outline" size="sm">
                                    <Upload />
                                    Upload
                                </Button>
                            </UploadReplayDialog>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={isFetching}
                            >
                                <RefreshCw className={cn(isFetching && 'animate-spin')} />
                                Refresh
                            </Button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col gap-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-14 w-full rounded-lg" />
                            ))}
                        </div>
                    ) : total === 0 ? (
                        <div
                            className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
                            <Package className="mb-3 size-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">No replays stored yet.</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Download replays from Recent Matches.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className={cn(
                                'flex flex-col gap-2 transition-opacity',
                                isPlaceholderData && 'opacity-60',
                            )}>
                                {storedMatches.map((replay) => {
                                    const showDetails = replay.formatVersion !== 1;

                                    const shownButtons: ReplayRowButton[] = [
                                        ReplayRowButtons.INJECT,
                                        ReplayRowButtons.EDIT,
                                        ReplayRowButtons.DELETE,
                                        ReplayRowButtons.DOWNLOAD,
                                    ];

                                    if (showDetails) {
                                        shownButtons.push(ReplayRowButtons.DETAILS);
                                    }

                                    return (
                                        <ReplayEntry key={replay.uuid} replay={replay} shownButtons={shownButtons} />
                                    );
                                })}
                            </div>

                            {totalPages > 1 && (
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (page > 1) setPage(page - 1);
                                                }}
                                                aria-disabled={page <= 1}
                                                className={cn(page <= 1 && 'pointer-events-none opacity-50')}
                                            />
                                        </PaginationItem>
                                        {pageWindow(page, totalPages).map((item, i) =>
                                            item === 'ellipsis' ? (
                                                <PaginationItem key={`ellipsis-${i}`}>
                                                    <PaginationEllipsis />
                                                </PaginationItem>
                                            ) : (
                                                <PaginationItem key={item}>
                                                    <PaginationLink
                                                        isActive={item === page}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setPage(item);
                                                        }}
                                                    >
                                                        {item}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            ),
                                        )}
                                        <PaginationItem>
                                            <PaginationNext
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (page < totalPages) setPage(page + 1);
                                                }}
                                                aria-disabled={page >= totalPages}
                                                className={cn(page >= totalPages && 'pointer-events-none opacity-50')}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}
