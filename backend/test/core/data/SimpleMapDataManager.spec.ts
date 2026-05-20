import { SimpleMapDataManager } from '@/core/data/SimpleMapDataManager';
import { beforeEach, describe, expect, it } from 'vitest';

describe('SimpleMapDataManager', () => {
    let manager: SimpleMapDataManager<string, number>;

    beforeEach(() => {
        manager = new SimpleMapDataManager();
    });

    describe('getView', () => {
        it('returns null when empty', () => {
            expect(manager.getView()).toBeNull();
        });

        it('returns all stored entries as a record', () => {
            manager.updateKeyValue('a', 1);
            manager.updateKeyValue('b', 2);
            expect(manager.getView()).toEqual({ a: 1, b: 2 });
        });

        it('returns null after all keys are deleted individually', () => {
            manager.updateKeyValue('a', 1);
            manager.deleteKey('a');
            expect(manager.getView()).toBeNull();
        });

        it('returns null after deleteState', () => {
            manager.updateKeyValue('a', 1);
            manager.deleteState();
            expect(manager.getView()).toBeNull();
        });
    });

    describe('getKeyView', () => {
        it('returns null for an unknown key', () => {
            expect(manager.getKeyView('missing')).toBeNull();
        });

        it('returns the stored value for a known key', () => {
            manager.updateKeyValue('x', 42);
            expect(manager.getKeyView('x')).toBe(42);
        });

        it('returns null after the key is deleted', () => {
            manager.updateKeyValue('x', 42);
            manager.deleteKey('x');
            expect(manager.getKeyView('x')).toBeNull();
        });
    });

    describe('updateKeyValue', () => {
        it('stores a new value', () => {
            manager.updateKeyValue('key', 99);
            expect(manager.getKeyView('key')).toBe(99);
        });

        it('overwrites an existing value', () => {
            manager.updateKeyValue('key', 1);
            manager.updateKeyValue('key', 2);
            expect(manager.getKeyView('key')).toBe(2);
        });
    });

    describe('updateKeyValueBatch', () => {
        it('stores multiple entries at once', () => {
            manager.updateKeyValueBatch({ a: 1, b: 2, c: 3 });
            expect(manager.getKeyView('a')).toBe(1);
            expect(manager.getKeyView('b')).toBe(2);
            expect(manager.getKeyView('c')).toBe(3);
        });

        it('merges batch entries with existing keys', () => {
            manager.updateKeyValue('existing', 10);
            manager.updateKeyValueBatch({ newKey: 20 });
            expect(manager.getKeyView('existing')).toBe(10);
            expect(manager.getKeyView('newKey')).toBe(20);
        });

        it('overwrites existing keys included in the batch', () => {
            manager.updateKeyValue('key', 1);
            manager.updateKeyValueBatch({ key: 99 });
            expect(manager.getKeyView('key')).toBe(99);
        });
    });

    describe('deleteKey', () => {
        it('removes an existing key', () => {
            manager.updateKeyValue('key', 5);
            manager.deleteKey('key');
            expect(manager.getKeyView('key')).toBeNull();
        });

        it('does not throw when deleting a missing key', () => {
            expect(() => manager.deleteKey('nonexistent')).not.toThrow();
        });

        it('leaves other keys intact', () => {
            manager.updateKeyValue('a', 1);
            manager.updateKeyValue('b', 2);
            manager.deleteKey('a');
            expect(manager.getKeyView('b')).toBe(2);
        });
    });

    describe('deleteState', () => {
        it('removes all entries', () => {
            manager.updateKeyValue('a', 1);
            manager.updateKeyValue('b', 2);
            manager.deleteState();
            expect(manager.getKeyView('a')).toBeNull();
            expect(manager.getKeyView('b')).toBeNull();
        });

        it('allows new entries to be added after clearing', () => {
            manager.updateKeyValue('a', 1);
            manager.deleteState();
            manager.updateKeyValue('b', 2);
            expect(manager.getKeyView('b')).toBe(2);
        });
    });
});
