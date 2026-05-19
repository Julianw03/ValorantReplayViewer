import { IObjectDataManager } from '@/core/data/interfaces/IObjectDataManager';
import { ViewMappingObjectDataBehavior } from '@/core/data/behaviors/viewMapping/ViewMappingObjectDataBehavior';
import { SimpleObjectDataManager } from '@/core/data/SimpleObjectDataManager';

export class RecomputingObjectMappingBehavior<S, From, To> extends ViewMappingObjectDataBehavior<S, From, To> {
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
        this.stateManager.updateValue(value);
        this.cache.updateValue(this.mappingFn(this.stateManager.getView()!));
    }

    getView(): To | null {
        return this.cache.getView();
    }
}