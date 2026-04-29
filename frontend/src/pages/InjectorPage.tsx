import { CheckCircle2, Clock, Download, Info, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { queryKeys, useCancelInject } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { type InjectState, InjectStates } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore.ts';

const STEPS: { state: InjectState; label: string }[] = [
    { state: InjectStates.DOWNLOADING_PLACEHOLDER, label: 'Preparing' },
    { state: InjectStates.AWAITING_REPLAY_START, label: 'Waiting for start' },
    { state: InjectStates.INJECTED, label: 'Injected' },
    { state: InjectStates.RESTORING_ORIGINAL_REPLAY, label: 'Restoring original' },
];

const STEP_ORDER: InjectState[] = [
    InjectStates.DOWNLOADING_PLACEHOLDER,
    InjectStates.AWAITING_REPLAY_START,
    InjectStates.INJECTED,
    InjectStates.RESTORING_ORIGINAL_REPLAY,
];

const STATE_DESCRIPTION: Record<InjectState, string> = {
    IDLE: 'No injection in progress. Go to Saved Replays, find a match, and click the inject button.',
    DOWNLOADING_PLACEHOLDER:
        'Fetching a placeholder replay from Riot servers. This is used as a stand-in so VALORANT loads correctly.',
    AWAITING_REPLAY_START:
        'Open the placeholder match in VALORANT\'s Replay viewer. Once the replay begins loading, the target replay will be swapped in automatically.',
    INJECTED:
        'Injection complete. The target replay is now active inside VALORANT. Return here to monitor when it ends.',
    RESTORING_ORIGINAL_REPLAY:
        'The original placeholder replay is being restored. This usually happens after the injected replay finishes, but can also be triggered by cancelling mid-inject.',
    FAILED:
        'Something went wrong during injection. Cancel below to reset, then try again from Saved Replays.',
};

function StateIcon({ state }: { state: InjectState }) {
    switch (state) {
        case InjectStates.IDLE:
            return <Clock className="size-5 text-muted-foreground" />;
        case InjectStates.DOWNLOADING_PLACEHOLDER:
            return <Download className="size-5 text-blue-400" />;
        case InjectStates.AWAITING_REPLAY_START:
            return <Clock className="size-5 text-amber-400" />;
        case InjectStates.INJECTED:
            return <CheckCircle2 className="size-5 text-green-500" />;
        case InjectStates.RESTORING_ORIGINAL_REPLAY:
            return <Loader2 className="size-5 animate-spin text-muted-foreground" />;
        case InjectStates.FAILED:
            return <XCircle className="size-5 text-destructive" />;
    }
}

function ProgressSteps({ currentState }: { currentState: InjectState }) {
    if (currentState === InjectStates.FAILED) {
        return (
            <div
                className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <XCircle className="size-4 shrink-0" />
                Injection failed — cancel to reset
            </div>
        );
    }

    const currentIdx = STEP_ORDER.indexOf(currentState);

    return (
        <div className="flex items-start justify-center">
            {STEPS.map((step, i) => {
                const done = i < currentIdx;
                const active = i === currentIdx;
                return (
                    <div key={step.state} className="flex items-start">
                        <div className="flex flex-col items-center gap-2">
                            <div
                                className={cn(
                                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors',
                                    done
                                        ? 'border-green-500 bg-green-500/15 text-green-500'
                                        : active
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border bg-muted/30 text-muted-foreground',
                                )}
                            >
                                {done ? <CheckCircle2 className="size-4" /> : i + 1}
                            </div>
                            <span
                                className={cn(
                                    'text-xs',
                                    active ? 'font-medium text-foreground' : 'text-muted-foreground',
                                )}
                            >
                {step.label}
              </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div
                                className={cn(
                                    'mx-3 mt-4 h-px w-20 shrink-0',
                                    i < currentIdx ? 'bg-green-500' : 'bg-border',
                                )}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export function InjectorPage() {
    const queryClient = useQueryClient();
    const injectStatus = useAppStore((s) => s.currentInjectState);
    const { mutate: cancelInject, isPending: isCancelling } = useCancelInject();

    const injectState = injectStatus?.state;
    const isActive = injectState !== InjectStates.IDLE;

    return (
        <div className="flex w-full flex-col gap-4">
            {/* Status header card */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4">
                <div className="flex items-center gap-3">
                    <StateIcon state={injectState} />
                    <div>
                        <p className="text-sm font-medium">{injectState.replaceAll('_', ' ')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.injectStatus })}
                    >
                        Refresh
                    </Button>
                    {isActive && (
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => cancelInject()}
                            disabled={isCancelling}
                        >
                            {isCancelling ? <Loader2 className="animate-spin" /> : null}
                            Cancel
                        </Button>
                    )}
                </div>
            </div>

            {/* Step progress */}
            <div className="rounded-lg border border-border bg-card px-5 py-5">
                <p className="mb-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Progress
                </p>
                <ProgressSteps currentState={injectState} />
            </div>



            {/* Contextual description */}
            <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 px-5 py-4">
                <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{STATE_DESCRIPTION[injectState]}</p>
            </div>
        </div>
    );
}