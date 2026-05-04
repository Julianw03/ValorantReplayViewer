import { _INTERNALS_MAP_DELETE_KEY, _INTERNALS_MAP_SET_KEY_VALUE, MapDataManager } from '@/caching/base/MapDataManager';
import { describe, it, expect, beforeEach } from 'vitest';

class TestMapManager extends MapDataManager<string, number, string> {

    public constructor() {
        super();
    }

    protected getViewForValue(value: number | null): string | null {
        return value !== null ? `value:${value}` : null;
    }
    protected async resetInternalState(): Promise<void> {

    }
}


describe('MapDataManager', () => {
    let manager: TestMapManager;

    beforeEach(() => { manager = new TestMapManager(); });

    it('getEntryView returns null for unknown key', () => {
        expect(manager.getEntryView('missing')).toBeNull();
    });

    it('setKeyValue updates view via getViewForValue', () => {
        manager[_INTERNALS_MAP_SET_KEY_VALUE]('a', 42);
        expect(manager.getEntryView('a')).toBe('value:42');
    });

    it('deleteKey sets view to null', () => {
        manager[_INTERNALS_MAP_SET_KEY_VALUE]('a', 42);
        manager[_INTERNALS_MAP_DELETE_KEY]('a');
        expect(manager.getEntryView('a')).toBeNull();
    });

    it('getView returns the entire object', async () => {
        manager[_INTERNALS_MAP_SET_KEY_VALUE]('a', 100);
        manager[_INTERNALS_MAP_SET_KEY_VALUE]('b', 200);

        const view = manager.getView()!;
        expect(view).not.toBeNull();
        expect(view['a']).toEqual('value:100');
        expect(view['b']).toEqual('value:200');
    })
})