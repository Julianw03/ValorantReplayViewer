import { AsyncResult, AsyncResultType, AsyncResultUnion } from '#/utils/AsyncResult';
import { MapDataManager } from '@/caching/base/MapDataManager';

export abstract class AsyncMapDataManager<K extends PropertyKey, T, V, E extends Error = Error>
    extends MapDataManager<K, AsyncResult<T, E>, AsyncResultUnion<V, E>> {

    private readonly pending = new Map<K, Promise<T>>();
    private resetMarker = 0;

    protected abstract fetch(key: K): Promise<T>;

    public requestFetch(key: K): void {
        this.injectPromise(key, this.fetch(key));
    }

    protected injectPromise(key: K, promise: Promise<T>): boolean {
        if (this.pending.has(key)) return false;
        const currentMarker = this.resetMarker;
        this.pending.set(key, promise);
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
                this.pending.delete(key)
            });
        return true;
    }

    public getResult(key: K, timeoutMs?: number): Promise<T> {
        const promise = this.pending.get(key) ?? Promise.reject(new Error(`No pending fetch for key ${String(key)}`));
        if (!timeoutMs) return promise;
        return Promise.race([
            promise,
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs),
            ),
        ]);
    }

    protected getViewForValue(value: AsyncResult<T, E> | null): AsyncResultUnion<V, E> | null {
        if (value === null) return null;
        return value.map(v => this.map(v)) as AsyncResultUnion<V, E>;
    }

    protected abstract map(value: T): V;

    protected override async resetInternalState(): Promise<void> {
        this.resetMarker++;
        this.pending.clear();
    }

    public async getBestEffortBatchedResult(keys: K[], timeoutMs?: number): Promise<Partial<Record<K, V>>> {
        const timeoutPromise = timeoutMs
            ? new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs),
            )
            : null;

        await Promise.allSettled(
            keys.map(key => {
                const promise = this.pending.get(key);
                if (!promise) return Promise.resolve();
                return timeoutPromise
                    ? Promise.race([promise, timeoutPromise])
                    : promise;
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
}