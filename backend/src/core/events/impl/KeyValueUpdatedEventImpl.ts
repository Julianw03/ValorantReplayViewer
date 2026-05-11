import { KeyUpdateActionType, KeyValueUpdatedEvent } from '@/core/events/BasicEvent';
import { EventType } from '@/core/events/EventTypes';

export class KeyValueUpdatedEventImpl<K extends PropertyKey, V>
    implements KeyValueUpdatedEvent<K, V> {
    public readonly type = EventType.KeyValueUpdated;
    public readonly timestamp = Date.now();

    constructor(
        public readonly source: string,
        public readonly payload: {
            key: K;
            value: V | null;
            action: KeyUpdateActionType;
        }
    ) {
    }

    static of<K extends PropertyKey, T>(
        source: string,
        key: K,
        value: T | null,
    ): KeyValueUpdatedEventImpl<K, T> {
        return new KeyValueUpdatedEventImpl<K, T>(source, {
            key,
            value,
            action: KeyUpdateActionType.UPDATED
        });
    }

    static ofDiff<K extends PropertyKey, T>(
        source: string,
        key: K,
        value: T | null,
        prevValue: T | null,
    ): KeyValueUpdatedEventImpl<K, T> {
        let action: KeyUpdateActionType;
        if (prevValue === null && value !== null) {
            action = KeyUpdateActionType.CREATED;
        } else if (prevValue !== null && value === null) {
            action = KeyUpdateActionType.DELETED;
        } else {
            action = KeyUpdateActionType.UPDATED;
        }

        return new KeyValueUpdatedEventImpl<K, T>(source, {
            key,
            value,
            action
        });
    }
}
