import { EmittingMapDataBehavior } from '@/core/data/behaviors/emission/EmittingMapDataBehavior';
import { SimpleMapDataManager } from '@/core/data/SimpleMapDataManager';
import { SimpleEventBus } from '@/core/events/SimpleEventBus';
import { KeyUpdateActionType } from '@/core/events/BasicEvent';
import { EventType } from '@/core/events/EventTypes';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SOURCE = 'test-source';

function makeSetup() {
    const inner = new SimpleMapDataManager<string, string>();
    const publish = vi.fn();
    const bus = { publish } as unknown as SimpleEventBus;
    const behavior = new EmittingMapDataBehavior(inner, bus, SOURCE);
    return { inner, publish, bus, behavior };
}

describe('EmittingMapDataBehavior', () => {
    describe('updateKeyValue', () => {
        it('publishes a CREATED event when adding a new key', () => {
            const { behavior, publish } = makeSetup();
            behavior.updateKeyValue('key', 'value');
            expect(publish).toHaveBeenCalledOnce();
            const event = publish.mock.calls[0][0];
            expect(event.type).toBe(EventType.KeyValueUpdated);
            expect(event.source).toBe(SOURCE);
            expect(event.payload.key).toBe('key');
            expect(event.payload.value).toBe('value');
            expect(event.payload.action).toBe(KeyUpdateActionType.CREATED);
        });

        it('publishes an UPDATED event when overwriting an existing key', () => {
            const { behavior, publish } = makeSetup();
            behavior.updateKeyValue('key', 'first');
            publish.mockClear();

            behavior.updateKeyValue('key', 'second');

            expect(publish).toHaveBeenCalledOnce();
            const event = publish.mock.calls[0][0];
            expect(event.payload.action).toBe(KeyUpdateActionType.UPDATED);
            expect(event.payload.value).toBe('second');
        });

        it('does not publish when the new value is the same reference', () => {
            const { behavior, publish } = makeSetup();
            behavior.updateKeyValue('key', 'same');
            publish.mockClear();

            behavior.updateKeyValue('key', 'same');

            expect(publish).not.toHaveBeenCalled();
        });
    });

    describe('deleteKey', () => {
        it('publishes a DELETED event when removing an existing key', () => {
            const { behavior, publish } = makeSetup();
            behavior.updateKeyValue('key', 'value');
            publish.mockClear();

            behavior.deleteKey('key');

            expect(publish).toHaveBeenCalledOnce();
            const event = publish.mock.calls[0][0];
            expect(event.type).toBe(EventType.KeyValueUpdated);
            expect(event.payload.action).toBe(KeyUpdateActionType.DELETED);
            expect(event.payload.key).toBe('key');
            expect(event.payload.value).toBeNull();
        });

        it('does not publish when the key does not exist', () => {
            const { behavior, publish } = makeSetup();
            behavior.deleteKey('nonexistent');
            expect(publish).not.toHaveBeenCalled();
        });
    });

    describe('deleteState', () => {
        it('publishes a StateUpdated event with null payload', () => {
            const { behavior, publish } = makeSetup();
            behavior.updateKeyValue('key', 'value');
            publish.mockClear();

            behavior.deleteState();

            expect(publish).toHaveBeenCalledOnce();
            const event = publish.mock.calls[0][0];
            expect(event.type).toBe(EventType.StateUpdated);
            expect(event.source).toBe(SOURCE);
            expect(event.payload.value).toBeNull();
        });

        it('publishes even when the map is already empty', () => {
            const { behavior, publish } = makeSetup();
            behavior.deleteState();
            expect(publish).toHaveBeenCalledOnce();
        });
    });

    describe('updateKeyValueBatch', () => {
        it('publishes a StateUpdated event with the resulting view', () => {
            const { behavior, publish } = makeSetup();
            behavior.updateKeyValueBatch({ a: '1', b: '2' });
            expect(publish).toHaveBeenCalledOnce();
            const event = publish.mock.calls[0][0];
            expect(event.type).toBe(EventType.StateUpdated);
            expect(event.payload.value).toEqual({ a: '1', b: '2' });
        });

        it('always publishes regardless of prior state', () => {
            const { behavior, publish } = makeSetup();
            behavior.updateKeyValueBatch({ x: 'a' });
            publish.mockClear();
            behavior.updateKeyValueBatch({ x: 'a' });
            expect(publish).toHaveBeenCalledOnce();
        });
    });

    describe('getKeyView', () => {
        it('delegates to the inner manager', () => {
            const { inner, behavior } = makeSetup();
            inner.updateKeyValue('key', 'val');
            expect(behavior.getKeyView('key')).toBe('val');
        });

        it('returns null for an unknown key', () => {
            const { behavior } = makeSetup();
            expect(behavior.getKeyView('missing')).toBeNull();
        });
    });

    describe('getView', () => {
        it('delegates to the inner manager', () => {
            const { inner, behavior } = makeSetup();
            inner.updateKeyValue('a', '1');
            expect(behavior.getView()).toEqual({ a: '1' });
        });

        it('returns null when the inner manager is empty', () => {
            const { behavior } = makeSetup();
            expect(behavior.getView()).toBeNull();
        });
    });
});
