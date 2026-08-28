import { IObjectDataManager } from '@/core/data/interfaces/IObjectDataManager';
import { SimpleObjectDataManager } from '@/core/data/SimpleObjectDataManager';

export interface MarkerEvent {
}

export interface MachineContext<E extends MarkerEvent> {
    dispatch(event: E): void;

    readonly signal: AbortSignal;
}

export interface MarkerState<S extends MarkerState<S, E, D>, E extends MarkerEvent, D> {
    transitionOn(event: E): S | undefined;

    onEnter?(ctx: D & MachineContext<E>): Promise<void>;
}

export type StateEnterErrorHandler<S> = (state: S, error: unknown) => void;

export class StateMachine<S extends MarkerState<S, E, D>, E extends MarkerEvent, D>
    implements IObjectDataManager<E, S> {
    private current: S;

    private readonly inner: IObjectDataManager<S, unknown>;

    private readonly queue: E[] = [];
    private draining = false;
    private entry: AbortController | null = null;

    constructor(
        private readonly initialState: S,
        private readonly deps: D,
        inner: IObjectDataManager<S, unknown>,
        private readonly onEnterFailed: StateEnterErrorHandler<S> = (state, error) =>
            console.error(`onEnter failed in ${state.constructor.name}`, error),
    ) {
        this.current = initialState;
        this.inner = inner;
        this.inner.updateValue(initialState);
    }

    private dispatch(event: E): void {
        this.queue.push(event);
        if (!this.draining) this.drain();
    }

    updateValue(value: E): void {
        this.dispatch(value);
    }

    deleteState(): void {
        this.reset();
    }

    getView(): S | null {
        return this.current;
    }

    reset(): void {
        this.entry?.abort();
        this.entry = null;
        this.queue.length = 0;
        this.current = this.initialState;
        this.inner.updateValue(this.initialState);
    }

    private drain(): void {
        this.draining = true;
        try {
            while (this.queue.length) {
                const event = this.queue.shift()!;
                const next = this.current.transitionOn(event);
                if (!next || next === this.current) continue;

                this.entry?.abort();
                const entry = new AbortController();
                this.entry = entry;

                this.current = next;
                this.inner.updateValue(next);

                void Promise.resolve(next.onEnter?.(this.contextFor(entry.signal)))
                    .catch((error) => this.onEnterFailed(next, error));
            }
        } finally {
            this.draining = false;
        }
    }

    private contextFor(signal: AbortSignal): D & MachineContext<E> {
        return {
            ...this.deps,
            signal,
            dispatch: (event: E) => {
                if (signal.aborted) return;
                this.dispatch(event);
            },
        };
    }
}