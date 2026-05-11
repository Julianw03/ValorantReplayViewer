export interface DataViewable<V> {
    getView(): V | null;
}