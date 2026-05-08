import { IMapDataManager } from '@/caching/base/interfaces/IMapDataManager';
import { SimpleEventBus } from '@/events/SimpleEventBus';
import { KeyValueUpdatedEventImpl } from '@/events/impl/KeyValueUpdatedEventImpl';
import { StateUpdatedEventImpl } from '@/events/impl/StateUpdatedEventImpl';

export class EmittingMapDataBehavior<K extends PropertyKey, S, V> implements IMapDataManager<K, S, V> {
    constructor(
        private readonly inner: IMapDataManager<K, S, V>,
        private readonly eventBus: SimpleEventBus,
        private readonly source: string,
    ) {
    }

    updateKeyValue(key: K, value: S): void {
        const prev = this.inner.getKeyView(key);
        this.inner.updateKeyValue(key, value);
        const next = this.inner.getKeyView(key);
        if (prev !== next) {
            this.eventBus.publish(KeyValueUpdatedEventImpl.ofDiff(this.source, key, next, prev));
        }
    }

    deleteState(): void {
        this.inner.deleteState();
        this.eventBus.publish(StateUpdatedEventImpl.of(this.source, null));
    }

    getKeyView(key: K): V | null {
        return this.inner.getKeyView(key);
    }

    getView(): Record<K, V> | null {
        return this.inner.getView();
    }

    deleteKey(key: K): void {
        const prev = this.inner.getKeyView(key);
        this.inner.deleteKey(key);
        const next = this.inner.getKeyView(key);
        if (prev !== next) {
            this.eventBus.publish(KeyValueUpdatedEventImpl.ofDiff(this.source, key, next, prev));
        }
    }

    updateKeyValueBatch(entries: Record<K, S>): void {
        this.inner.updateKeyValueBatch(entries);
        this.eventBus.publish(StateUpdatedEventImpl.of(this.source, this.inner.getView()));
    }
}