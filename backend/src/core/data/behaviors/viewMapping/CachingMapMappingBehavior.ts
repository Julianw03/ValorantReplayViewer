import { ViewMappingMapDataBehavior } from '@/core/data/behaviors/viewMapping/ViewMappingMapDataBehavior';
import { IMapDataManager } from '@/core/data/interfaces/IMapDataManager';
import { SimpleMapDataManager } from '@/core/data/SimpleMapDataManager';

export class CachingMapMappingBehavior<K extends PropertyKey, S, From, To> extends ViewMappingMapDataBehavior<K, S, From, To> {
    private cache: IMapDataManager<K, To, To> = new SimpleMapDataManager<K, To>();

    public constructor(
        stateManager: IMapDataManager<K, S, From>,
        mappingFn: (from: From) => To,
    ) {
        super(
            stateManager,
            mappingFn,
        );
    }

    updateKeyValueBatch(entries: Record<K, S>) {
        this.stateManager.updateKeyValueBatch(entries);
        const backingState = this.stateManager.getView()!;
        const cacheUpdate = {} as Record<K, To>;

        for (const key in backingState) {
            cacheUpdate[key as K] = this.mappingFn(backingState[key]);
        }

        this.cache.updateKeyValueBatch(cacheUpdate);
    }

    updateKeyValue(key: K, value: S) {
        this.stateManager.updateKeyValue(key, value);
        const backedVal = this.stateManager.getKeyView(key)!;
        this.cache.updateKeyValue(key, this.mappingFn(backedVal));
    }

    deleteState(): void {
        this.stateManager.deleteState();
        this.cache.deleteState();
    }

    getKeyView(key: K): To | null {
        return this.cache.getKeyView(key);
    }

    getView(): Record<K, To> | null {
        return this.cache.getView();
    }

    deleteKey(key: K): void {
        this.stateManager.deleteKey(key);
        this.cache.deleteKey(key);
    }
}