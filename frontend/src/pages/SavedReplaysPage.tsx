import {AlertCircle, BugPlay, Info, Package, RefreshCw, Upload} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Skeleton} from '@/components/ui/skeleton'
import {queryKeys, useStorageStatus, useStoredMatches} from '@/lib/queries'
import {useQueryClient} from '@tanstack/react-query'
import {cn} from '@/lib/utils'
import {StorageCard} from '@/components/saved-replays/StorageCard'
import {ReplayRow, GRID_COLS} from '@/components/saved-replays/ReplayRow'
import {UploadReplayDialog} from '@/components/saved-replays/UploadReplayDialog'

export function SavedReplaysPage() {
    const queryClient = useQueryClient()
    const {data: storageStatus} = useStorageStatus()
    const {data: storedMatches = [], isLoading, isFetching} = useStoredMatches()

    const isSetup = storageStatus?.isSetup ?? false

    function handleRefresh() {
        queryClient.invalidateQueries({queryKey: queryKeys.storageStatus})
        queryClient.invalidateQueries({queryKey: queryKeys.storedMatches})
    }

    return (
        <div className="flex flex-col gap-4">
            <StorageCard/>

            {!isSetup && storageStatus && (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                    <AlertCircle className="size-4 shrink-0"/>
                    Initialize storage above to start saving and managing replays.
                </div>
            )}

            {isSetup && (
                <>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {storedMatches.length > 0
                                ? `${storedMatches.length} ${storedMatches.length === 1 ? 'replay' : 'replays'}`
                                : 'No replays stored'}
                        </p>
                        <div className="flex items-center gap-2">
                            <UploadReplayDialog>
                                <Button variant="outline" size="sm">
                                    <Upload/>
                                    Upload .vrp
                                </Button>
                            </UploadReplayDialog>
                            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
                                <RefreshCw className={cn(isFetching && 'animate-spin')}/>
                                Refresh
                            </Button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col gap-2">
                            {Array.from({length: 4}).map((_, i) => (
                                <Skeleton key={i} className="h-14 w-full rounded-lg"/>
                            ))}
                        </div>
                    ) : storedMatches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
                            <Package className="mb-3 size-8 text-muted-foreground"/>
                            <p className="text-sm text-muted-foreground">No replays stored yet.</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Download replays from Recent Matches.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {/* Column header — same grid template as ReplayRow */}
                            <div
                                className="grid items-center gap-3 px-4 text-xs font-medium text-muted-foreground"
                                style={{gridTemplateColumns: GRID_COLS}}
                            >
                                <div>Queue</div>
                                <div>Map</div>
                                <div>User</div>
                                <div>Downloaded</div>
                                <div/>
                            </div>
                            {storedMatches
                                .sort((a, b) => (b?.downloadInfo?.downloadedAt ?? 0) - (a?.downloadInfo?.downloadedAt ?? 0))
                                .map((replay) => (
                                <ReplayRow key={replay.matchInfo.matchId} replay={replay}/>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3">
                        <Info className="size-4 shrink-0 text-muted-foreground"/>
                        <p className="text-sm text-muted-foreground">
                            Use the <span className="inline-flex items-center mx-1"><BugPlay className="size-3.5"/></span>
                            inject button on any saved replay to start the process.
                        </p>
                    </div>
                </>
            )}
        </div>
    )
}
