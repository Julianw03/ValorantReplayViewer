import { TrieNode } from '@/riotclient/messaging/trie/TrieNode';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parsePatternString } from '@/riotclient/messaging/path/PatternParser';
import { PATH_TYPE } from '@/riotclient/messaging/path/PathPattern';

describe('TrieNode', () => {
    let root: TrieNode;

    beforeEach(() => {
        root = new TrieNode();
    });

    describe('resolveOrAdd', () => {
        it('returns the root node for an empty path', () => {
            const node = root.resolveOrAdd([]);
            expect(node).toBe(root);
        });

        it('creates a static child node', () => {
            const path = parsePatternString('/foo');
            const node = root.resolveOrAdd(path);
            expect(node).not.toBe(root);
        });

        it('returns the same node for the same static path called twice', () => {
            const path = parsePatternString('/foo/bar');
            const a = root.resolveOrAdd(path);
            const b = root.resolveOrAdd(path);
            expect(a).toBe(b);
        });

        it('creates a matching child node for a capture segment', () => {
            const path = parsePatternString('/{id}');
            const node = root.resolveOrAdd(path);
            expect(node).not.toBe(root);
        });

        it('returns the same matching node called twice', () => {
            const path = parsePatternString('/{id}');
            const a = root.resolveOrAdd(path);
            const b = root.resolveOrAdd(path);
            expect(a).toBe(b);
        });

        it('creates separate nodes for different static paths', () => {
            const a = root.resolveOrAdd(parsePatternString('/foo'));
            const b = root.resolveOrAdd(parsePatternString('/bar'));
            expect(a).not.toBe(b);
        });

        it('handles mixed static + matching segments', () => {
            const path = parsePatternString('/users/{id}/profile');
            const node = root.resolveOrAdd(path);
            expect(node).not.toBe(root);
            // Same path resolves to the same node
            expect(root.resolveOrAdd(path)).toBe(node);
        });
    });

    describe('collectMatches', () => {
        it('returns [root] for an empty parts array', () => {
            expect(root.collectMatches([])).toEqual([root]);
        });

        it('returns empty array when no path is registered', () => {
            expect(root.collectMatches(['foo'])).toEqual([]);
        });

        it('matches an exact static path', () => {
            const node = root.resolveOrAdd(parsePatternString('/foo/bar'));
            const matches = root.collectMatches(['foo', 'bar']);
            expect(matches).toContain(node);
            expect(matches).toHaveLength(1);
        });

        it('matches a capture segment against any value', () => {
            const node = root.resolveOrAdd(parsePatternString('/{id}'));
            expect(root.collectMatches(['anything'])).toContain(node);
            expect(root.collectMatches(['other'])).toContain(node);
        });

        it('matches both static and capture nodes when both exist', () => {
            const staticNode = root.resolveOrAdd(parsePatternString('/foo'));
            const captureNode = root.resolveOrAdd(parsePatternString('/{id}'));
            const matches = root.collectMatches(['foo']);
            expect(matches).toContain(staticNode);
            expect(matches).toContain(captureNode);
            expect(matches).toHaveLength(2);
        });

        it('matches nested capture path', () => {
            const node = root.resolveOrAdd(parsePatternString('/users/{id}/profile'));
            expect(root.collectMatches(['users', '42', 'profile'])).toContain(node);
        });

        it('does not match if segment count differs', () => {
            root.resolveOrAdd(parsePatternString('/foo/bar'));
            expect(root.collectMatches(['foo', 'bar', 'baz'])).toEqual([]);
        });
    });

    describe('complete', () => {
        it('completes the subject', () => {
            const completed = vi.fn();
            root.observable.subscribe({ complete: completed });
            root.complete();
            expect(completed).toHaveBeenCalledOnce();
        });

        it('recursively completes child nodes', () => {
            const child = root.resolveOrAdd(parsePatternString('/foo'));
            const completed = vi.fn();
            child.observable.subscribe({ complete: completed });
            root.complete();
            expect(completed).toHaveBeenCalledOnce();
        });

        it('recursively completes matching child nodes', () => {
            const child = root.resolveOrAdd(parsePatternString('/{id}'));
            const completed = vi.fn();
            child.observable.subscribe({ complete: completed });
            root.complete();
            expect(completed).toHaveBeenCalledOnce();
        });

        it('nulls out state after completion', () => {
            root.resolveOrAdd(parsePatternString('/foo'));
            root.complete();
            // After complete, static map and matching child should be null
            // (accessing internals only to verify cleanup)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const states = (root as any).states;
            expect(states[PATH_TYPE.STATIC]).toBeNull();
            expect(states[PATH_TYPE.MATCHING]).toBeNull();
        });
    });
});
