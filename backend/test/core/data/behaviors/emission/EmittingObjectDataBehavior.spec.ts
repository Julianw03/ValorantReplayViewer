import { EmittingObjectDataBehavior } from '@/core/data/behaviors/emission/EmittingObjectDataBehavior';
import { SimpleObjectDataManager } from '@/core/data/SimpleObjectDataManager';
import { SimpleEventBus } from '@/core/events/SimpleEventBus';
import { EventType } from '@/core/events/EventTypes';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SOURCE = 'test-source';

function makeSetup() {
    const inner = new SimpleObjectDataManager<string>();
    const publish = vi.fn();
    const bus = { publish } as unknown as SimpleEventBus;
    const behavior = new EmittingObjectDataBehavior(inner, bus, SOURCE);
    return { inner, publish, bus, behavior };
}

describe('EmittingObjectDataBehavior', () => {
    describe('updateValue', () => {
        it('publishes a StateUpdated event when setting a new value', () => {
            const { behavior, publish } = makeSetup();
            behavior.updateValue('hello');
            expect(publish).toHaveBeenCalledOnce();
            const event = publish.mock.calls[0][0];
            expect(event.type).toBe(EventType.StateUpdated);
            expect(event.source).toBe(SOURCE);
            expect(event.payload.value).toBe('hello');
        });

        it('publishes when the value changes', () => {
            const { behavior, publish } = makeSetup();
            behavior.updateValue('first');
            publish.mockClear();

            behavior.updateValue('second');

            expect(publish).toHaveBeenCalledOnce();
            const event = publish.mock.calls[0][0];
            expect(event.payload.value).toBe('second');
        });

        it('does not publish when the same reference is set again', () => {
            const { behavior, publish } = makeSetup();
            behavior.updateValue('same');
            publish.mockClear();

            behavior.updateValue('same');

            expect(publish).not.toHaveBeenCalled();
        });
    });

    describe('deleteState', () => {
        it('publishes a StateUpdated event with null after clearing state', () => {
            const { behavior, publish } = makeSetup();
            behavior.updateValue('data');
            publish.mockClear();

            behavior.deleteState();

            expect(publish).toHaveBeenCalledOnce();
            const event = publish.mock.calls[0][0];
            expect(event.type).toBe(EventType.StateUpdated);
            expect(event.source).toBe(SOURCE);
            expect(event.payload.value).toBeNull();
        });

        it('publishes even when no value was previously set', () => {
            const { behavior, publish } = makeSetup();
            behavior.deleteState();
            expect(publish).toHaveBeenCalledOnce();
        });
    });

    describe('getView', () => {
        it('delegates to the inner manager', () => {
            const { inner, behavior } = makeSetup();
            inner.updateValue('direct');
            expect(behavior.getView()).toBe('direct');
        });

        it('returns null when the inner manager has no state', () => {
            const { behavior } = makeSetup();
            expect(behavior.getView()).toBeNull();
        });
    });
});
