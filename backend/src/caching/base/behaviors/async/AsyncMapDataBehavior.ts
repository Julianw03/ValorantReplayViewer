import { AsyncResult, AsyncResultUnion } from '#/utils/AsyncResult';
import { IMapDataManager } from '@/caching/base/interfaces/IMapDataManager';
import { DataViewable } from '@/caching/base/interfaces/capabilities/DataViewable';
import { KeyDataViewable } from '@/caching/base/interfaces/capabilities/KeyDataViewable';
import { withMaxTimeout } from '@/utils/PromiseUtils';
import { DataDeletable } from '@/caching/base/interfaces/capabilities/DataDeletable';

const TIMED_OUT = Symbol('TIMED_OUT');
type TimedOut = typeof TIMED_OUT;

export type AsyncMapBackable<K extends PropertyKey, V, E extends Error> =
    DataViewable<Record<K, AsyncResultUnion<V, E>>>
    & KeyDataViewable<K, AsyncResultUnion<V, E>>
    & DataDeletable;

export class AsyncMapDataBehavior<K extends PropertyKey, V, E extends Error> implements AsyncMapBackable<K, V, E> {
    private readonly pending = new Map<K, Promise<V>>();
    private resetMarker = 0;

    public constructor(
        protected readonly externalRepresentation: IMapDataManager<K, AsyncResultUnion<V, E>, AsyncResultUnion<V, E>>,
    ) {
    }

    protected injectPromise(key: K, promise: Promise<V>): boolean {
        if (this.pending.has(key)) return false;
        this.pending.set(key, promise);
        const currentMarker = this.resetMarker;
        this.externalRepresentation.updateKeyValue(key, AsyncResult.pending());

        promise
            .then(data => {
                if (this.resetMarker !== currentMarker) return;
                this.externalRepresentation.updateKeyValue(key, AsyncResult.success(data));
            })
            .catch(e => {
                if (this.resetMarker !== currentMarker) return;
                this.externalRepresentation.updateKeyValue(key, AsyncResult.failure(e as E));
            });

        return true;
    }

    private awaitBestEffort(promise: Promise<V>, timeoutMs?: number): Promise<V | TimedOut> {
        const guarded = promise.catch((): TimedOut => TIMED_OUT);
        if (!timeoutMs) return guarded;

        return new Promise<V | TimedOut>(resolve => {
            const timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
            guarded.then(result => {
                clearTimeout(timer);
                resolve(result);
            });
        });
    }

    public getResult(key: K, timeoutMs?: number): Promise<V> {
        const promise = this.pending.get(key);
        if (!promise) {
            return Promise.reject(new Error(`No pending fetch for key ${String(key)}`));
        }
        return withMaxTimeout(promise, timeoutMs ?? 0);
    }

    public async getBestEffortBatchedResult(keys: K[], timeoutMs?: number): Promise<Partial<Record<K, V>>> {
        await Promise.all(
            keys.map(key => {
                const promise = this.pending.get(key);
                if (!promise) return;
                return this.awaitBestEffort(promise, timeoutMs);
            }),
        );

        const result = {} as Partial<Record<K, V>>;
        for (const key of keys) {
            const view = this.externalRepresentation.getKeyView(key);
            if (view?.isSuccess()) {
                result[key] = view.data;
            }
        }
        return result;
    }

    getKeyView(key: K): AsyncResultUnion<V, E> | null {
        return this.externalRepresentation.getKeyView(key);
    }

    getView(): Record<K, AsyncResultUnion<V, E>> | null {
        return this.externalRepresentation.getView();
    }

    deleteState(): void {
        this.resetMarker++;
        this.pending.clear();
    }
}