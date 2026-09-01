import { OutputMappingMapBehavior } from '@/core/data/behaviors/viewMapping/OutputMappingMapBehavior';
import { IMapDataManager } from '@/core/data/interfaces/IMapDataManager';
import { MAPPING_FAILED, safeMap } from '@/core/data/behaviors/viewMapping/MappingError';

export class OutputMappingRecomputingMapBehavior<K extends PropertyKey, S, From, To> extends OutputMappingMapBehavior<K, S, From, To> {
    public constructor(
        stateManager: IMapDataManager<K, S, From>,
        mappingFn: (from: From) => To,
    ) {
        super(
            stateManager,
            mappingFn,
        );
    }

    deleteState(): void {
        this.stateManager.deleteState();
    }

    updateKeyValue(key: K, value: S): void {
        const prev = this.stateManager.getKeyView(key);
        this.stateManager.updateKeyValue(key, value);
        this.rejectIfUnmappable(key, prev);
    }

    updateKeyValueBatch(entries: Record<K, S>): void {
        const prev = this.stateManager.getView();
        this.stateManager.updateKeyValueBatch(entries);
        for (const key in entries) {
            this.rejectIfUnmappable(key as K, prev?.[key as K] ?? null);
        }
    }

    updateValue(value: Record<K, S>): void {
        const prev = this.stateManager.getView();
        this.stateManager.updateValue(value);
        for (const key in value) {
            this.rejectIfUnmappable(key as K, prev?.[key as K] ?? null);
        }
    }

    getKeyView(key: K): To | null {
        const backingEntry = this.stateManager.getKeyView(key);
        if (backingEntry === null) {
            return null;
        }
        const mapped = safeMap(this.mappingFn, backingEntry, this.constructor.name);
        return mapped === MAPPING_FAILED ? null : mapped;
    }

    getView(): Record<K, To> | null {
        const backingState = this.stateManager.getView();
        if (backingState === null) {
            return null;
        }
        const mappedState: Record<K, To> = {} as Record<K, To>;
        for (const key in backingState) {
            if (backingState[key] === null) {
                continue;
            }
            const mapped = safeMap(this.mappingFn, backingState[key], this.constructor.name);
            if (mapped !== MAPPING_FAILED) {
                mappedState[key] = mapped;
            }
        }
        return mappedState;
    }

    deleteKey(key: K): void {
        this.stateManager.deleteKey(key);
    }

    // Restoring a rejected write re-injects the prior backing view as-is, which assumes the
    // backing store's set type and view type coincide (true for SimpleMapDataManager).
    private rejectIfUnmappable(key: K, prev: From | null): void {
        const backed = this.stateManager.getKeyView(key);
        if (backed === null) {
            return;
        }
        if (safeMap(this.mappingFn, backed, this.constructor.name) !== MAPPING_FAILED) {
            return;
        }
        if (prev === null) {
            this.stateManager.deleteKey(key);
        } else {
            this.stateManager.updateKeyValue(key, prev as unknown as S);
        }
    }
}
