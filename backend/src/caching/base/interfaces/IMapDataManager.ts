import { KeyDataViewable } from '@/caching/base/interfaces/capabilities/KeyDataViewable';
import { DataViewable } from '@/caching/base/interfaces/capabilities/DataViewable';
import { DataDeletable } from '@/caching/base/interfaces/capabilities/DataDeletable';
import { KeyDataDeletable } from '@/caching/base/interfaces/capabilities/KeyDataDeletable';
import { KeyDataUpdatable } from '@/caching/base/interfaces/capabilities/KeyDataUpdatable';
import { KeyDataBatchUpdatable } from '@/caching/base/interfaces/capabilities/KeyDataBatchUpdatable';

export interface IMapDataManager<K extends PropertyKey, S, V> extends KeyDataDeletable<K>,
    KeyDataViewable<K, V>,
    KeyDataUpdatable<K, S>,
    KeyDataBatchUpdatable<K, S>,
    DataDeletable,
    DataViewable<Record<K, V>> {
}