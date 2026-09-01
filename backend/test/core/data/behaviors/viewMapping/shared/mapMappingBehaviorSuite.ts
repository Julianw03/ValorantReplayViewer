import { SimpleMapDataManager } from '@/core/data/SimpleMapDataManager';
import { IMapDataManager } from '@/core/data/interfaces/IMapDataManager';
import { MappingError } from '@/core/data/behaviors/viewMapping/MappingError';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rejectingLength = (s: string): number => {
    if (s === 'bad') throw new MappingError('rejected');
    return s.length;
};

type MapBehaviorFactory = (
    inner: SimpleMapDataManager<string, string>,
    mappingFn: (s: string) => number,
) => IMapDataManager<string, string, number>;

export function runMapMappingBehaviorSuite(factory: MapBehaviorFactory): void {
    let inner: SimpleMapDataManager<string, string>;
    let mappingFn: ReturnType<typeof vi.fn>;
    let behavior: IMapDataManager<string, string, number>;

    beforeEach(() => {
        inner = new SimpleMapDataManager();
        mappingFn = vi.fn((s: string) => s.length);
        behavior = factory(inner, mappingFn as (s: string) => number);
    });

    describe('getKeyView', () => {
        it('returns null for an unknown key', () => {
            expect(behavior.getKeyView('missing')).toBeNull();
        });

        it('applies the mapping function to the stored value', () => {
            behavior.updateKeyValue('key', 'hello');
            expect(behavior.getKeyView('key')).toBe(5);
        });

        it('reflects updates to the stored value', () => {
            behavior.updateKeyValue('key', 'ab');
            expect(behavior.getKeyView('key')).toBe(2);
            behavior.updateKeyValue('key', 'abcde');
            expect(behavior.getKeyView('key')).toBe(5);
        });

        it('returns null after deleteKey', () => {
            behavior.updateKeyValue('key', 'value');
            behavior.deleteKey('key');
            expect(behavior.getKeyView('key')).toBeNull();
        });
    });

    describe('getView', () => {
        it('returns null when empty', () => {
            expect(behavior.getView()).toBeNull();
        });

        it('returns a mapped record for all entries', () => {
            behavior.updateKeyValue('a', 'x');
            behavior.updateKeyValue('b', 'yyy');
            expect(behavior.getView()).toEqual({ a: 1, b: 3 });
        });
    });

    describe('updateKeyValueBatch', () => {
        it('sets all entries and maps them correctly', () => {
            behavior.updateKeyValueBatch({ a: 'hi', b: 'hello' });
            expect(behavior.getKeyView('a')).toBe(2);
            expect(behavior.getKeyView('b')).toBe(5);
        });
    });

    describe('updateValue', () => {
        it('replaces all entries with mapped values and drops absent keys', () => {
            behavior.updateKeyValueBatch({ old: 'x', kept: 'yy' });
            behavior.updateValue({ kept: 'zzz', added: 'wwww' });
            expect(behavior.getKeyView('old')).toBeNull();
            expect(behavior.getView()).toEqual({ kept: 3, added: 4 });
        });
    });

    describe('mapping failure', () => {
        it('keeps the previous value when a mapping update throws MappingError', () => {
            behavior.updateKeyValue('key', 'ok');
            mappingFn.mockImplementation(rejectingLength);

            behavior.updateKeyValue('key', 'bad');

            expect(behavior.getKeyView('key')).toBe(2);
            expect(behavior.getView()).toEqual({ key: 2 });
        });

        it('does not create a key when its first mapping throws MappingError', () => {
            mappingFn.mockImplementation(rejectingLength);

            behavior.updateKeyValue('key', 'bad');

            expect(behavior.getKeyView('key')).toBeNull();
            expect(behavior.getView()).toBeNull();
        });

        it('propagates a non-MappingError thrown by the mapping function', () => {
            mappingFn.mockImplementation((s: string) => {
                if (s === 'boom') throw new Error('unexpected');
                return s.length;
            });

            expect(() => behavior.updateKeyValue('key', 'boom')).toThrow('unexpected');
        });

        it('applies a later successful write after a rejected one', () => {
            mappingFn.mockImplementation(rejectingLength);

            behavior.updateKeyValue('key', 'bad');
            behavior.updateKeyValue('key', 'good');

            expect(behavior.getKeyView('key')).toBe(4);
        });

        it('rejects only the failing entries in a batch', () => {
            behavior.updateKeyValueBatch({ a: 'xx', b: 'yy' });
            mappingFn.mockImplementation(rejectingLength);

            behavior.updateKeyValueBatch({ a: 'bad', b: 'yyyy' });

            expect(behavior.getKeyView('a')).toBe(2);
            expect(behavior.getKeyView('b')).toBe(4);
        });

        it('rejects only the failing entries in updateValue and drops absent keys', () => {
            behavior.updateKeyValueBatch({ old: 'x', kept: 'yy' });
            mappingFn.mockImplementation(rejectingLength);

            behavior.updateValue({ kept: 'bad', added: 'zzzz' });

            expect(behavior.getKeyView('old')).toBeNull();
            expect(behavior.getKeyView('kept')).toBe(2);
            expect(behavior.getKeyView('added')).toBe(4);
        });
    });

    describe('deleteKey', () => {
        it('removes the entry', () => {
            behavior.updateKeyValue('key', 'value');
            behavior.deleteKey('key');
            expect(behavior.getKeyView('key')).toBeNull();
        });
    });

    describe('deleteState', () => {
        it('clears all entries', () => {
            behavior.updateKeyValue('a', 'x');
            behavior.updateKeyValue('b', 'y');
            behavior.deleteState();
            expect(behavior.getView()).toBeNull();
        });
    });
}
