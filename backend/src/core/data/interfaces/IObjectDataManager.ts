import { DataDeletable } from '@/core/data/interfaces/capabilities/DataDeletable';
import { DataViewable } from '@/core/data/interfaces/capabilities/DataViewable';
import { DataUpdatable } from '@/core/data/interfaces/capabilities/DataUpdatable';

export interface IObjectDataManager<S, V> extends DataDeletable,
    DataViewable<V>,
    DataUpdatable<S> {
}