import { IObjectDataManager } from '@/core/data/interfaces/IObjectDataManager';

export class SimpleObjectDataManager<V> implements IObjectDataManager<V, V> {
    private state: V | null = null;

    deleteState(): void {
        this.state = null;
    }

    getView(): V | null {
        return this.state;
    }

    updateValue(value: V): void {
        this.state = value;
    }
}