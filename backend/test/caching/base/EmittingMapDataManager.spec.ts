import { EmittingMapDataManager } from '@/caching/base/EmittingMapDataManager';
import { beforeEach, describe, expect, it } from 'vitest';
import { SimpleEventBus } from '@/events/SimpleEventBus';
import { SimpleEventBusImpl } from '@/events/impl/SimpleEventBusImpl';
import { BasicEvent, KeyUpdateActionType, KeyValueUpdatedEvent } from '@/events/BasicEvent';
import { EventType } from '@/events/EventTypes';

class RawData {
    raw: string;
}

class ViewData {
    view: string;
}


const mapper = (value: RawData): ViewData => {
    return {
        view: value.raw,
    };
};

class TestEmittingMapDataManager extends EmittingMapDataManager<string, RawData, ViewData> {
    public constructor(eventBus: SimpleEventBus) {
        super(eventBus);
    }

    protected getViewForValue(value: RawData | null): ViewData | null {
        return value ? mapper(value) : null;
    }

    protected resetInternalState(): Promise<void> {
        return Promise.resolve(undefined);
    }
}

describe('EmittingMapDataManager', () => {
    let eventBus: SimpleEventBus;
    let manager: TestEmittingMapDataManager;

    beforeEach(() => {
        eventBus = new SimpleEventBusImpl();
        manager = new TestEmittingMapDataManager(eventBus);
    });

    it('Update of keys, when a previous value exists should force action "UPDATE"', async () => {
        let resolve: (data: BasicEvent<EventType>) => void;
        const prev: RawData = { raw: 'prev' };

        manager.setKeyValue('key', prev);

        const raw: RawData = { raw: 'value' };
        const promise = new Promise<BasicEvent<EventType>>(r => resolve = r);
        const unsubscribe = eventBus.subscribeOnSource(
            TestEmittingMapDataManager.name,
            (data) => {
                resolve(data);
            },
        );

        manager.setKeyValue('key', raw);

        const event = await promise;
        unsubscribe();

        expect(event.type).toBe(EventType.KeyValueUpdated);
        expect(event.source).toBe(manager.constructor.name);

        const typedEvent = event as KeyValueUpdatedEvent<string, ViewData>

        expect(typedEvent.payload.key).toBe('key')
        expect(typedEvent.payload.value).toStrictEqual(mapper(raw));
        expect(typedEvent.payload.action).toBe(KeyUpdateActionType.UPDATED)
    })

    it('Update of keys should emit an appropriate event', async () => {
        let resolve: (data: BasicEvent<EventType>) => void;
        const raw: RawData = { raw: 'value' };
        const promise = new Promise<BasicEvent<EventType>>(r => resolve = r);
        const unsubscribe = eventBus.subscribeOnSource(
            TestEmittingMapDataManager.name,
            (data) => {
                resolve(data);
            },
        );

        manager.setKeyValue('key', raw);

        const event = await promise;
        unsubscribe();


        expect(event.type).toBe(EventType.KeyValueUpdated);
        expect(event.source).toBe(manager.constructor.name);

        const typedEvent = event as KeyValueUpdatedEvent<string, ViewData>

        expect(typedEvent.payload.key).toBe('key')
        expect(typedEvent.payload.value).toStrictEqual(mapper(raw));
        expect(typedEvent.payload.action).toBe(KeyUpdateActionType.CREATED)
    });
});