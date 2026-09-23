import { HardDrive, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useSetupStorage, useStorageStatus, useTeardownStorage } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { formatBytes } from './formatters'

export function StorageCard() {
    const {data: storageStatus, isLoading} = useStorageStatus()
    const {mutate: setupStorage, isPending: isSettingUp} = useSetupStorage()
    const {mutate: teardownStorage, isPending: isTearingDown} = useTeardownStorage()

    if (isLoading && !storageStatus) {
        return <Skeleton className="h-20 w-full rounded-lg"/>
    }

    const isSetup = storageStatus?.isSetup ?? false

    return (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4">
            <div className="flex items-center gap-4">
                <div className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    isSetup ? 'bg-green-500/15' : 'bg-muted',
                )}>
                    <HardDrive className={cn('size-5', isSetup ? 'text-green-500' : 'text-muted-foreground')}/>
                </div>
                <div>
                    <p className="text-sm font-medium">
                        {isSetup ? 'Storage Active' : 'Storage Not Initialized'}
                    </p>
                    {isSetup && storageStatus && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {storageStatus.matchCount}{' '}
                            {storageStatus.matchCount === 1 ? 'replay' : 'replays'} ·{' '}
                            {formatBytes(storageStatus.totalSizeBytes)}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                {!isSetup ? (
                    <Button size="sm" onClick={() => setupStorage()} disabled={isSettingUp}>
                        {isSettingUp ? <><Loader2 className="animate-spin"/>Initializing…</> : 'Initialize Storage'}
                    </Button>
                ) : (
                    <ConfirmDialog
                        title="Delete storage?"
                        description={<>
                            This will permanently delete all{' '}
                            {storageStatus?.matchCount ?? 0}{' '}
                            {(storageStatus?.matchCount ?? 0) === 1 ? 'replay' : 'replays'} and remove the storage directory. This action cannot be undone.
                        </>}
                        confirmLabel="Delete"
                        onConfirm={() => teardownStorage()}
                    >
                        <Button size="sm" variant="destructive" disabled={isTearingDown}>
                            {isTearingDown ? <><Loader2 className="animate-spin"/>Deleting…</> : 'Delete Storage'}
                        </Button>
                    </ConfirmDialog>
                )}
            </div>
        </div>
    )
}
