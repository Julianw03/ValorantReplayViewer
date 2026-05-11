import { IObjectDataManager } from '@/core/data/interfaces/IObjectDataManager';

export enum ObjectBackingPolicy {
    RECOMPUTE,
    CACHE,
}

type ObjectMappingBehaviorOptions = {
    backingPolicy?: ObjectBackingPolicy;
};

export abstract class ViewMappingObjectDataBehavior<S, From, To> implements IObjectDataManager<S, To> {
    protected constructor(
        protected readonly stateManager: IObjectDataManager<S, From>,
        protected readonly mappingFn: (from: From) => To,
    ) {

    }

    deleteState(): void {
        this.stateManager.deleteState();
    }

    abstract getView(): To | null;

    updateValue(value: S): void {
        this.stateManager.updateValue(value);
    }
}