export enum EventType {
    StateUpdated = 'StateUpdated',
    KeyValueUpdated = 'KeyValueUpdated',
}

export type EventMap = {
    [EventType.StateUpdated]: { value: unknown | null };
    [EventType.KeyValueUpdated]: {
        key: PropertyKey;
        value: unknown | null;
    };
};
