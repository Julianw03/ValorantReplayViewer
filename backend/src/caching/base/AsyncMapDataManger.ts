import { AsyncResult, AsyncResultType, AsyncResultUnion } from '#/utils/AsyncResult';
import { MapDataManager } from '@/caching/base/MapDataManager';
import { withMaxTimeout } from '@/utils/PromiseUtils';

const TIMED_OUT = Symbol('TIMED_OUT');
type TimedOut = typeof TIMED_OUT;
export const _INTERNALS_INJECT_PROMISE = Symbol('INTERNALS_INJECT_PROMISE');

export abstract class AsyncMapDataManager<K extends PropertyKey, T, V, E extends Error = Error>
    extends MapDataManager<K, AsyncResult<T, E>, AsyncResultUnion<V, E>> {

    private readonly pending = new Map<K, Promise<T>>();
    private resetMarker = 0;

    protected abstract fetch(key: K): Promise<T>;

    public requestFetch(key: K): void {
        this.injectPromise(key, this.fetch(key));
    }

    protected injectPromise(key: K, promise: Promise<T>): boolean {
        let existing = this.pending.get(key);
        if (existing) return false;
        this.pending.set(key, promise);
        const currentMarker = this.resetMarker;
        this.setKeyValue(key, AsyncResult.pending());

        promise
            .then(data => {
                if (this.resetMarker !== currentMarker) return;
                this.setKeyValue(key, AsyncResult.success(data));
            })
            .catch(e => {
                if (this.resetMarker !== currentMarker) return;
                this.setKeyValue(key, AsyncResult.failure(e as E))
            })
            .finally(() => {
                if (this.resetMarker !== currentMarker) return;
            });
        return true;
    }

    public getResult(key: K, timeoutMs?: number): Promise<T> {
        const promise = this.pending.get(key);
        if (!promise) {
            return Promise.reject(new Error(`No pending fetch for key ${String(key)}`))
        }
        return withMaxTimeout(promise, timeoutMs ?? 0);
    }

    protected getViewForValue(value: AsyncResult<T, E> | null): AsyncResultUnion<V, E> | null {
        if (value === null) return null;
        return value.map(v => this.map(v)) as AsyncResultUnion<V, E>;
    }

    protected abstract map(value: T): V;

    protected override async resetInternalState(): Promise<void> {
        this.resetMarker++;
        this.pending.clear();
        await super.resetInternalState();
    }


    private awaitBestEffort(promise: Promise<T>, timeoutMs?: number): Promise<T | TimedOut> {
        const guarded = promise.catch((): TimedOut => TIMED_OUT);
        if (!timeoutMs) return guarded;

        return new Promise<T | TimedOut>(resolve => {
            const timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
            guarded.then(result => {
                clearTimeout(timer);
                resolve(result);
            });
        });
    }

    public async getBestEffortBatchedResult(keys: K[], timeoutMs?: number): Promise<Partial<Record<K, V>>> {
        await Promise.all(
            keys.map(key => {
                const promise = this.pending.get(key);
                if (!promise) return;
                return this.awaitBestEffort(promise, timeoutMs);
            })
        );

        const result = {} as Partial<Record<K, V>>;
        for (const key of keys) {
            const view = this.getEntryView(key);
            if (view?.isSuccess()) {
                result[key] = view.data;
            }
        }
        return result;
    }

    public [_INTERNALS_INJECT_PROMISE] = this.injectPromise.bind(this);
}