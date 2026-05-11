import { EventMap, EventType } from '@/core/events/EventTypes';

export interface BasicEvent<TType extends EventType> {
    readonly type: TType;
    readonly payload: EventMap[TType];
    readonly timestamp: number;
    readonly source: string;
}

export type EventOf<T extends EventType> = BasicEvent<T>;

export interface StateUpdatedEvent<T>
    extends BasicEvent<EventType.StateUpdated> {
    readonly payload: { value: T | null };
}

export enum KeyUpdateActionType {
    CREATED = 'CREATED',
    UPDATED = 'UPDATED',
    DELETED = 'DELETED'
}

export interface KeyValueUpdatedEvent<K extends PropertyKey, V>
    extends BasicEvent<EventType.KeyValueUpdated> {
    readonly payload: { key: K; value: V | null; action: KeyUpdateActionType };
}