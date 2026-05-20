import { SimpleObjectDataManager } from '@/core/data/SimpleObjectDataManager';
import { IObjectDataManager } from '@/core/data/interfaces/IObjectDataManager';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
}
