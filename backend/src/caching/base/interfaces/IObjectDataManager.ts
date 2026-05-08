import { DataDeletable } from '@/caching/base/interfaces/capabilities/DataDeletable';
import { DataViewable } from '@/caching/base/interfaces/capabilities/DataViewable';
import { DataUpdatable } from '@/caching/base/interfaces/capabilities/DataUpdatable';

export interface IObjectDataManager<S, V> extends DataDeletable,
    DataViewable<V>,
    DataUpdatable<S> {
}