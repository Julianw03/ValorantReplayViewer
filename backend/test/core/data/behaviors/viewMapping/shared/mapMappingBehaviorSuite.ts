import { SimpleMapDataManager } from '@/core/data/SimpleMapDataManager';
import { IMapDataManager } from '@/core/data/interfaces/IMapDataManager';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
