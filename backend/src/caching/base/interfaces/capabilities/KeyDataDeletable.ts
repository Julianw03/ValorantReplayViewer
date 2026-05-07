import { DataDeletable } from '@/caching/base/interfaces/capabilities/DataDeletable';

export interface KeyDataDeletable<K extends PropertyKey> extends DataDeletable {
    deleteKey(key: K): void;
}