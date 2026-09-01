import { IObjectDataManager } from '@/core/data/interfaces/IObjectDataManager';
import { OutputMappingObjectBehavior } from '@/core/data/behaviors/viewMapping/OutputMappingObjectBehavior';
import { SimpleObjectDataManager } from '@/core/data/SimpleObjectDataManager';
import { MAPPING_FAILED, safeMap } from '@/core/data/behaviors/viewMapping/MappingError';

export class OutputMappingCachingObjectBehavior<S, From, To> extends OutputMappingObjectBehavior<S, From, To> {
    private cache: IObjectDataManager<To, To> = new SimpleObjectDataManager<To>();

    public constructor(
        stateManager: IObjectDataManager<S, From>,
        mappingFn: (from: From) => To,
    ) {
        super(
            stateManager,
            mappingFn,
        );
    }

    deleteState() {
        this.stateManager.deleteState();
        this.cache.deleteState();
    }

    updateValue(value: S): void {
        const prev = this.stateManager.getView();
        this.stateManager.updateValue(value);
        const backed = this.stateManager.getView();
        if (backed === null) {
            this.cache.deleteState();
            return;
        }
        const mapped = safeMap(this.mappingFn, backed, this.constructor.name);
        if (mapped === MAPPING_FAILED) {
            if (prev === null) {
                this.stateManager.deleteState();
            } else {
                this.stateManager.updateValue(prev as unknown as S);
            }
            return;
        }
        this.cache.updateValue(mapped);
    }

    getView(): To | null {
        return this.cache.getView();
    }
}
