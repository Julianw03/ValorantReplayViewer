import { IObjectDataManager } from '@/caching/base/interfaces/IObjectDataManager';
import { ViewMappingObjectDataBehavior } from '@/caching/base/behaviors/viewMapping/ViewMappingObjectDataBehavior';

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