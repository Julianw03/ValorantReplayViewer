import { _INTERNALS_INJECT_PROMISE, AsyncMapDataManager } from '@/caching/base/AsyncMapDataManger';
import { _INTERNALS_RESET_STATE } from '@/caching/base/GenericDataManager';
import { AsyncResultType, Failure, Pending, Success } from '#/utils/AsyncResult';
import { TimeoutError } from '@/utils/PromiseUtils';
import * as process from 'node:process';

class RawData {
    raw: string;
}

class ViewData {
    view: string;
}

const mapper = (value: RawData): ViewData => {
    return { view: value.raw };
}

class TestAsyncManager extends AsyncMapDataManager<string, RawData, ViewData> {
    public constructor() {
        super();
    }

    protected fetch(key: string): Promise<RawData> {
        return Promise.resolve({ raw: key });
    }

    protected map(value: RawData): ViewData {
        return mapper(value);
    }
}

describe('AsyncMapDataManager', () => {
    let manager: TestAsyncManager;

    beforeEach(() => {
        manager = new TestAsyncManager();
    });

    it('stale promise is ignored after reset', async () => {
        let resolve!: (v: RawData) => void;
        const stalePromise = new Promise<RawData>(r => resolve = r);

        manager[_INTERNALS_INJECT_PROMISE]('key', stalePromise);
        await manager[_INTERNALS_RESET_STATE]();

        resolve({ raw: 'stale' });
        await Promise.resolve();

        expect(manager.getEntryView('key')).toBeNull();
    });

    it('promise state "resolved" gets correctly mapped', async () => {
        manager.requestFetch('key');
        const result = await manager.getResult('key');

        const externalView = manager.getEntryView('key') as Success<ViewData, Error>;
        expect(externalView?.type).toBe(AsyncResultType.SUCCESS);
        expect(externalView?.data).toStrictEqual(mapper(result));
    })

    it('promise state "reject" gets correctly mapped', async () => {
        const error = new Error('fetch failed');
        manager[_INTERNALS_INJECT_PROMISE]('key', Promise.reject(error));

        await expect(manager.getResult('key')).rejects.toThrow('fetch failed');
        const view = manager.getEntryView('key') as Failure<ViewData, Error>;
        expect(view).not.toBeNull();
        expect(view.type).toBe(AsyncResultType.FAILURE);
        expect(view.error).toStrictEqual(error);
    })

    it('promise state "pending" gets correctly mapped', async () => {
        let resolve!: (v: RawData) => void;
        const pendingPromise = new Promise<RawData>(r => resolve = r);
        manager[_INTERNALS_INJECT_PROMISE]('key', pendingPromise);

        await expect(manager.getResult('key', 0)).rejects.toThrow();
        const view = manager.getEntryView('key') as Pending<ViewData, Error>;
        expect(view).not.toBeNull();
        expect(view.type).toBe(AsyncResultType.PENDING);

        resolve({ raw: 'resolved' });
    })

    it('getResult rejects with TimeoutError for long-lived promises', async () => {
        let resolve!: (v: RawData) => void;
        const longLivingPromise = new Promise<RawData>(r => resolve = r);

        manager[_INTERNALS_INJECT_PROMISE]('key', longLivingPromise);

        await expect(manager.getResult('key', 50)).rejects.toThrow(TimeoutError);

        resolve({ raw: 'eventually' });
    });

    it('getBestEffortBatchedResult only includes successful keys', async () => {
        manager[_INTERNALS_INJECT_PROMISE]('ok', Promise.resolve({ raw: 'x' }));
        manager[_INTERNALS_INJECT_PROMISE]('fail', Promise.reject(new Error('boom')));

        const result = await manager.getBestEffortBatchedResult(['ok', 'fail']);
        expect(result).toHaveProperty('ok');
        expect(result).not.toHaveProperty('fail');
    });

    it('fetches running during a reset should not set the newState', async () => {
        let resolve!: (v: RawData) => void;
        const longLivingPromise = new Promise<RawData>(r => resolve = r);
        manager[_INTERNALS_INJECT_PROMISE]('ok', longLivingPromise);
        await manager[_INTERNALS_RESET_STATE]();
        resolve({ raw: 'ok' });

        const view = manager.getEntryView('key');
        expect(view).toBeNull();
        await expect(manager.getResult('ok')).rejects.toThrow();
    })
});