import { SimpleObjectDataManager } from '@/core/data/SimpleObjectDataManager';
import { IObjectDataManager } from '@/core/data/interfaces/IObjectDataManager';
import { MappingError } from '@/core/data/behaviors/viewMapping/MappingError';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rejectingLength = (s: string): number => {
    if (s === 'bad') throw new MappingError('rejected');
    return s.length;
};

type ObjectBehaviorFactory = (
    inner: SimpleObjectDataManager<string>,
    mappingFn: (s: string) => number,
) => IObjectDataManager<string, number>;

export function runObjectMappingBehaviorSuite(factory: ObjectBehaviorFactory): void {
    let inner: SimpleObjectDataManager<string>;
    let mappingFn: ReturnType<typeof vi.fn>;
    let behavior: IObjectDataManager<string, number>;

    beforeEach(() => {
        inner = new SimpleObjectDataManager();
        mappingFn = vi.fn((s: string) => s.length);
        behavior = factory(inner, mappingFn as (s: string) => number);
    });

    it('returns null when no state has been set', () => {
        expect(behavior.getView()).toBeNull();
    });

    it('applies the mapping function to the stored value', () => {
        behavior.updateValue('hello');
        expect(behavior.getView()).toBe(5);
    });

    it('reflects updates to the stored value', () => {
        behavior.updateValue('a');
        expect(behavior.getView()).toBe(1);
        behavior.updateValue('abcde');
        expect(behavior.getView()).toBe(5);
    });

    it('returns null after deleteState', () => {
        behavior.updateValue('test');
        behavior.deleteState();
        expect(behavior.getView()).toBeNull();
    });

    it('does not call the mapping function when state is null', () => {
        behavior.getView();
        expect(mappingFn).not.toHaveBeenCalled();
    });

    describe('mapping failure', () => {
        it('keeps the previous value when a mapping update throws MappingError', () => {
            behavior.updateValue('ok');
            mappingFn.mockImplementation(rejectingLength);

            behavior.updateValue('bad');

            expect(behavior.getView()).toBe(2);
        });

        it('does not set state when the first mapping throws MappingError', () => {
            mappingFn.mockImplementation(rejectingLength);

            behavior.updateValue('bad');

            expect(behavior.getView()).toBeNull();
        });

        it('propagates a non-MappingError thrown by the mapping function', () => {
            mappingFn.mockImplementation((s: string) => {
                if (s === 'boom') throw new Error('unexpected');
                return s.length;
            });

            expect(() => behavior.updateValue('boom')).toThrow('unexpected');
        });

        it('applies a later successful write after a rejected one', () => {
            mappingFn.mockImplementation(rejectingLength);

            behavior.updateValue('bad');
            behavior.updateValue('good');

            expect(behavior.getView()).toBe(4);
        });
    });
}
