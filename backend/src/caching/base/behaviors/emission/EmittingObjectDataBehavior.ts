import { IObjectDataManager } from '@/caching/base/interfaces/IObjectDataManager';
import { SimpleEventBus } from '@/events/SimpleEventBus';
import { StateUpdatedEventImpl } from '@/events/impl/StateUpdatedEventImpl';

export class EmittingObjectDataBehavior<S, V> implements IObjectDataManager<S, V> {
    constructor(
        private readonly inner: IObjectDataManager<S, V>,
        private readonly eventBus: SimpleEventBus,
        private readonly source: string,
    ) {
    }

    deleteState(): void {
        this.inner.deleteState();
        this.eventBus.publish(StateUpdatedEventImpl.of(this.source, null));
    }

    getView(): V | null {
        return this.inner.getView();
    }

    updateValue(value: S): void {
        const prev = this.getView();
        this.inner.updateValue(value);
        const next = this.getView();
        if (prev !== next) {
            this.eventBus.publish(StateUpdatedEventImpl.of(this.source, next));
        }
    }
}