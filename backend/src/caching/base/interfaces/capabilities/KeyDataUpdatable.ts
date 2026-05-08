export interface KeyDataUpdatable<K extends PropertyKey, V> {
    updateKeyValue(key: K, value: V): void;
}