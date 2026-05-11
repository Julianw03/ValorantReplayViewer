import { TrieRCUMessageDispatcher } from '@/core/riotclient/messaging/trie/TrieRCUMessageDispatcher';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RCUMessage } from '@/core/riotclient/messaging/RCUMessage';
import { firstValueFrom, take, toArray } from 'rxjs';
import { parsePatternString } from '@/core/riotclient/messaging/path/PatternParser';

function makeMessage(uri: string, extra: Partial<RCUMessage> = {}): RCUMessage {
    return { uri, ...extra } as RCUMessage;
}

function collect(obs: ReturnType<TrieRCUMessageDispatcher['on']>, count: number) {
    return firstValueFrom(obs.pipe(take(count), toArray()));
}


describe('TrieRCUMessageDispatcher', () => {
    let dispatcher: TrieRCUMessageDispatcher;

    beforeEach(() => {
        dispatcher = new TrieRCUMessageDispatcher();
    });

    it('delivers a message to a matching static subscriber', async () => {
        const obs = dispatcher.on(parsePatternString('/foo/bar'));
        const promise = collect(obs, 1);

        dispatcher.dispatch(makeMessage('/foo/bar'));

        const [result] = await promise;
        expect(result.message.uri).toBe('/foo/bar');
    });

    it('does not deliver a message to a non-matching subscriber', async () => {
        const received: unknown[] = [];
        dispatcher.on(parsePatternString('/foo/bar')).subscribe(m => received.push(m));

        dispatcher.dispatch(makeMessage('/foo/baz'));

        await new Promise(r => setTimeout(r, 0));
        expect(received).toHaveLength(0);
    });

    it('delivers a message to a capture subscriber', async () => {
        const obs = dispatcher.on(parsePatternString('/users/{id}'));
        const promise = collect(obs, 1);

        dispatcher.dispatch(makeMessage('/users/42'));

        const [result] = await promise;
        expect(result.matchResult.params['id']).toBe('42');
    });

    it('delivers to multiple subscribers on the same path', async () => {
        const obs1 = dispatcher.on(parsePatternString('/ping'));
        const obs2 = dispatcher.on(parsePatternString('/ping'));

        const p1 = collect(obs1, 1);
        const p2 = collect(obs2, 1);

        dispatcher.dispatch(makeMessage('/ping'));

        const [[r1], [r2]] = await Promise.all([p1, p2]);
        expect(r1.message.uri).toBe('/ping');
        expect(r2.message.uri).toBe('/ping');
    });

    it('delivers to both static and capture subscribers when both match', async () => {
        const staticObs = dispatcher.on(parsePatternString('/foo'));
        const captureObs = dispatcher.on(parsePatternString('/{any}'));

        const ps = collect(staticObs, 1);
        const pc = collect(captureObs, 1);

        dispatcher.dispatch(makeMessage('/foo'));

        const [[rs], [rc]] = await Promise.all([ps, pc]);
        expect(rs.message.uri).toBe('/foo');
        expect(rc.message.uri).toBe('/foo');
    });

    describe('PathMatchResult', () => {
        it('populates params for each capture segment', async () => {
            const obs = dispatcher.on(parsePatternString('/users/{userId}/posts/{postId}'));
            const promise = collect(obs, 1);

            dispatcher.dispatch(makeMessage('/users/99/posts/7'));

            const [result] = await promise;
            expect(result.matchResult.params).toEqual({ userId: '99', postId: '7' });
        });

        it('has empty params for a fully static path', async () => {
            const obs = dispatcher.on(parsePatternString('/health'));
            const promise = collect(obs, 1);

            dispatcher.dispatch(makeMessage('/health'));

            const [result] = await promise;
            expect(result.matchResult.params).toEqual({});
        });

        it('populates parts with the URI segments', async () => {
            const obs = dispatcher.on(parsePatternString('/a/b/c'));
            const promise = collect(obs, 1);

            dispatcher.dispatch(makeMessage('/a/b/c'));

            const [result] = await promise;
            expect(result.matchResult.parts).toEqual(['a', 'b', 'c']);
        });
    });

    it('delivers multiple sequential messages in order', async () => {
        const obs = dispatcher.on(parsePatternString('/stream'));
        const promise = collect(obs, 3);

        dispatcher.dispatch(makeMessage('/stream'));
        dispatcher.dispatch(makeMessage('/stream'));
        dispatcher.dispatch(makeMessage('/stream'));

        const results = await promise;
        expect(results).toHaveLength(3);
        results.forEach(r => expect(r.message.uri).toBe('/stream'));
    });

    describe('onModuleDestroy', () => {
        it('completes all observables on destroy', () => {
            const completed = vi.fn();
            dispatcher.on(parsePatternString('/foo')).subscribe({ complete: completed });
            dispatcher.onModuleDestroy();
            expect(completed).toHaveBeenCalledOnce();
        });

        it('stops delivering messages after destroy', async () => {
            const received: unknown[] = [];
            dispatcher.on(parsePatternString('/foo')).subscribe(m => received.push(m));
            dispatcher.onModuleDestroy();

            dispatcher.dispatch(makeMessage('/foo'));

            await new Promise(r => setTimeout(r, 0));
            expect(received).toHaveLength(0);
        });
    });
});