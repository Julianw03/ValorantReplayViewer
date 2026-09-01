import { OutputMappingMapBehavior } from '@/core/data/behaviors/viewMapping/OutputMappingMapBehavior';
import { IMapDataManager } from '@/core/data/interfaces/IMapDataManager';
import { SimpleMapDataManager } from '@/core/data/SimpleMapDataManager';
import { MAPPING_FAILED, safeMap } from '@/core/data/behaviors/viewMapping/MappingError';

export class OuputMappingCachingMapBehavior<K extends PropertyKey, S, From, To>
    extends OutputMappingMapBehavior<K, S, From, To> {
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
        const prev = this.stateManager.getView();
        this.stateManager.updateKeyValueBatch(entries);
        for (const key in entries) {
            this.reconcile(key as K, prev?.[key as K] ?? null);
        }
    }

    updateKeyValue(key: K, value: S) {
        const prev = this.stateManager.getKeyView(key);
        this.stateManager.updateKeyValue(key, value);
        this.reconcile(key, prev);
    }

    updateValue(value: Record<K, S>) {
        const prev = this.stateManager.getView();
        this.stateManager.updateValue(value);
        const backingState = this.stateManager.getView();

        const keptKeys = new Set<K>();
        if (backingState !== null) {
            for (const key in backingState) {
                keptKeys.add(key as K);
                this.reconcile(key as K, prev?.[key as K] ?? null);
            }
        }

        const cached = this.cache.getView();
        if (cached !== null) {
            for (const key in cached) {
                if (!keptKeys.has(key as K)) {
                    this.cache.deleteKey(key as K);
                }
            }
        }
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

    // Restoring a rejected write re-injects the prior backing view as-is, which assumes the
    // backing store's set type and view type coincide (true for SimpleMapDataManager). The
    // cache entry already matches that prior value, so it is left untouched.
    private reconcile(key: K, prev: From | null): void {
        const backed = this.stateManager.getKeyView(key);
        if (backed === null) {
            this.cache.deleteKey(key);
            return;
        }
        const mapped = safeMap(this.mappingFn, backed, this.constructor.name);
        if (mapped === MAPPING_FAILED) {
            if (prev === null) {
                this.stateManager.deleteKey(key);
            } else {
                this.stateManager.updateKeyValue(key, prev as unknown as S);
            }
            return;
        }
        this.cache.updateKeyValue(key, mapped);
    }
}
