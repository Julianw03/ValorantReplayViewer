export interface KeyDataBatchUpdatable<K extends PropertyKey, S> {
    updateKeyValueBatch(entries: Record<K, S>): void;
}