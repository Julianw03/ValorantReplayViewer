import { DataViewable } from '@/caching/base/interfaces/capabilities/DataViewable';

export interface KeyDataViewable<K extends PropertyKey, V> extends DataViewable<Record<K, V>> {
    getKeyView(key: K): V | null;
}