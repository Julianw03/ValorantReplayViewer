import { IMapDataManager } from '@/caching/base/interfaces/IMapDataManager';

export enum MapBackingPolicy {
    RECOMPUTE,
    CACHE,
}

type MapMappingBehaviorOptions = {
    backingPolicy?: MapBackingPolicy;
};

export abstract class ViewMappingMapDataBehavior<K extends PropertyKey, S, From, To> implements IMapDataManager<K, S, To> {
    protected constructor(
        protected readonly stateManager: IMapDataManager<K, S, From>,
        protected readonly mappingFn: (from: From) => To,
    ) {

    }

    deleteKey(key: K): void {
        this.stateManager.deleteKey(key);
    }

    deleteState(): void {
        this.stateManager.deleteState();
    }

    abstract getKeyView(key: K): To | null;

    abstract getView(): Record<K, To> | null;

    updateKeyValue(key: K, value: S): void {
        this.stateManager.updateKeyValue(key, value);
    }

    updateKeyValueBatch(entries: Record<K, S>): void {
        this.stateManager.updateKeyValueBatch(entries);
    }
}