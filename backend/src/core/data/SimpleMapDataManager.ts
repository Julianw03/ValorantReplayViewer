import { IMapDataManager } from '@/core/data/interfaces/IMapDataManager';

export class SimpleMapDataManager<K extends PropertyKey, V> implements IMapDataManager<K, V, V> {
    private readonly state = new Map<K, V>();

    updateKeyValue(key: K, value: V): void {
        this.state.set(key, value);
    }

    updateKeyValueBatch(entries: Record<K, V>): void {
        for (const key in entries) {
            this.state.set(key as K, entries[key]);
        }
    }

    deleteKey(key: K): void {
        this.state.delete(key);
    }

    deleteState(): void {
        this.state.clear();
    }

    getKeyView(key: K): V | null {
        return this.state.get(key) ?? null;
    }

    getView(): Record<K, V> | null {
        if (this.state.size === 0) return null;
        return Object.fromEntries(this.state) as Record<K, V>;
    }
}