import { IObjectDataManager } from '@/core/data/interfaces/IObjectDataManager';
import { ViewMappingObjectDataBehavior } from '@/core/data/behaviors/viewMapping/ViewMappingObjectDataBehavior';

export class RecomputingObjectMappingBehavior<S, From, To> extends ViewMappingObjectDataBehavior<S, From, To> {
    public constructor(
        stateManager: IObjectDataManager<S, From>,
        mappingFn: (from: From) => To,
    ) {
        super(
            stateManager,
            mappingFn,
        );
    }

    getView(): To | null {
        const backingEntry = this.stateManager.getView();
        if (backingEntry === null) {
            return null;
        }
        return this.mappingFn(backingEntry);
    }

}