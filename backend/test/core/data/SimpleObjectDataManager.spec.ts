import { SimpleObjectDataManager } from '@/core/data/SimpleObjectDataManager';
import { beforeEach, describe, expect, it } from 'vitest';

describe('SimpleObjectDataManager', () => {
    let manager: SimpleObjectDataManager<string>;

    beforeEach(() => {
        manager = new SimpleObjectDataManager();
    });

    it('returns null when no state has been set', () => {
        expect(manager.getView()).toBeNull();
    });

    it('returns the stored value after updateValue', () => {
        manager.updateValue('hello');
        expect(manager.getView()).toBe('hello');
    });

    it('overwrites the existing value on repeated updateValue calls', () => {
        manager.updateValue('first');
        manager.updateValue('second');
        expect(manager.getView()).toBe('second');
    });

    it('returns null after deleteState', () => {
        manager.updateValue('something');
        manager.deleteState();
        expect(manager.getView()).toBeNull();
    });

    it('preserves object reference identity', () => {
        const objManager = new SimpleObjectDataManager<{ x: number }>();
        const obj = { x: 1 };
        objManager.updateValue(obj);
        expect(objManager.getView()).toBe(obj);
    });

    it('allows new state to be set after deleteState', () => {
        manager.updateValue('before');
        manager.deleteState();
        manager.updateValue('after');
        expect(manager.getView()).toBe('after');
    });
});
