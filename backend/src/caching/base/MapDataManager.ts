import { GenericDataManager } from './GenericDataManager';

export const _INTERNALS_MAP_GET_ENTRY = Symbol('INTERNALS_MAP_GET_ENTRY');
export const _INTERNALS_MAP_SET_KEY_VALUE = Symbol(
    'INTERNALS_MAP_SET_KEY_VALUE',
);
export const _INTERNALS_MAP_DELETE_KEY = Symbol('INTERNALS_MAP_DELETE_KEY');

export abstract class MapDataManager<
    K extends PropertyKey,
    V,
    E,
> extends GenericDataManager<Map<K, V>, Record<K, E | null>> {
    private state: Map<K, V> = new Map<K, V>();
    private view: Record<K, E | null> = {} as Record<K, E | null>;

    protected constructor() {
        super();
    }

    protected abstract getViewForValue(value: V | null): E | null;

    protected getViewFor(val: Map<K, V>): Record<K, E | null> {
        if (val === null) {
            return {} as Record<K, E | null>;
        }

        return Object.fromEntries(
            Array.from(val.entries()).map(([key, value]) => [
                key,
                this.getViewForValue(value),
            ]),
        ) as Record<K, E | null>;
    }

    public getEntryView(key: K): E | null {
        return this.view[key] ?? null;
    }

    protected getState(): Map<K, V> | null {
        return this.state;
    }

    protected setState(state: Map<K, V>): void {
        this.state = state;
        this.view = this.getViewFor(state);
    }

    protected get(key: K): V | null {
        return this.state.get(key) ?? null;
    }

    protected setKeyValue(key: K, value: V): void {
        this.state.set(key, value);
        this.view[key] = this.getViewForValue(value);
    }

    protected deleteKey(key: K): void {
        this.state.delete(key);
        this.view[key] = this.getViewForValue(null);
    }

    protected async resetInternalState(): Promise<void> {
        this.setState(new Map());
    }

    public [_INTERNALS_MAP_GET_ENTRY] = this.getEntryView.bind(this);

    public [_INTERNALS_MAP_SET_KEY_VALUE] = this.setKeyValue.bind(this);

    public [_INTERNALS_MAP_DELETE_KEY] = this.deleteKey.bind(this);
}
