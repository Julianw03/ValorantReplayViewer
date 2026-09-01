import { IObjectDataManager } from '@/core/data/interfaces/IObjectDataManager';
import { OutputMappingObjectBehavior } from '@/core/data/behaviors/viewMapping/OutputMappingObjectBehavior';
import { MAPPING_FAILED, safeMap } from '@/core/data/behaviors/viewMapping/MappingError';

export class OuputMappingRecomputingObjectBehavior<S, From, To> extends OutputMappingObjectBehavior<S, From, To> {
    public constructor(
        stateManager: IObjectDataManager<S, From>,
        mappingFn: (from: From) => To,
    ) {
        super(
            stateManager,
            mappingFn,
        );
    }

    updateValue(value: S): void {
        const prev = this.stateManager.getView();
        this.stateManager.updateValue(value);
        const backed = this.stateManager.getView();
        if (backed === null) {
            return;
        }
        if (safeMap(this.mappingFn, backed, this.constructor.name) !== MAPPING_FAILED) {
            return;
        }
        if (prev === null) {
            this.stateManager.deleteState();
        } else {
            this.stateManager.updateValue(prev as unknown as S);
        }
    }

    getView(): To | null {
        const backingEntry = this.stateManager.getView();
        if (backingEntry === null) {
            return null;
        }
        const mapped = safeMap(this.mappingFn, backingEntry, this.constructor.name);
        return mapped === MAPPING_FAILED ? null : mapped;
    }

}
