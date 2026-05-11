import { KeyDataViewable } from '@/core/data/interfaces/capabilities/KeyDataViewable';
import { DataViewable } from '@/core/data/interfaces/capabilities/DataViewable';
import { DataDeletable } from '@/core/data/interfaces/capabilities/DataDeletable';
import { KeyDataDeletable } from '@/core/data/interfaces/capabilities/KeyDataDeletable';
import { KeyDataUpdatable } from '@/core/data/interfaces/capabilities/KeyDataUpdatable';
import { KeyDataBatchUpdatable } from '@/core/data/interfaces/capabilities/KeyDataBatchUpdatable';

export interface IMapDataManager<K extends PropertyKey, S, V> extends KeyDataDeletable<K>,
    KeyDataViewable<K, V>,
    KeyDataUpdatable<K, S>,
    KeyDataBatchUpdatable<K, S>,
    DataDeletable,
    DataViewable<Record<K, V>> {
}