import { DataDeletable } from '@/core/data/interfaces/capabilities/DataDeletable';

export interface KeyDataDeletable<K extends PropertyKey> extends DataDeletable {
    deleteKey(key: K): void;
}