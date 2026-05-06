import { TrieNode } from '@/riotclient/messaging/trie/TrieNode';
import { PATH_TYPE } from '@/riotclient/messaging/path/PathPattern';
import { map, Observable } from 'rxjs';
import { RCUMessage } from '@/riotclient/messaging/RCUMessage';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { AnyPathPattern } from '@/riotclient/messaging/path/PatternParser';

export interface PathMatchResult {
    params: Record<string, string>;
    parts: string[];
}

export interface ForwardedMessage {
    message: RCUMessage;
    matchResult: PathMatchResult;
}

/**
 * This class works well under the assumption that a subscription is persistent until
 * the application is destroyed. (or the number of practical unsubscribes is very low)
 * If unsubscribes were frequent and expected we should clean up nodes / paths that are unreachable
 * upon removal. Otherwise, we would end up with a lot of nodes that are never used but still consume memory.
 * */
@Injectable()
export class TrieRCUMessageDispatcher implements OnModuleDestroy {
    private readonly root = new TrieNode();

    public on(path: AnyPathPattern[]): Observable<ForwardedMessage> {
        const node = this.root.resolveOrAdd(path);
        const parts = path;

        return node.observable.pipe(
            map(event => {
                const uriParts = splitUri(event.uri);
                return {
                    matchResult: buildMatchResult(uriParts, parts),
                    message: event,
                };
            }),
        );
    }

    public dispatch(message: RCUMessage): void {
        const parts = splitUri(message.uri);
        for (const node of this.root.collectMatches(parts)) {
            node.subject.next(message);
        }
    }

    onModuleDestroy(): any {
        this.root.complete();
    }
}

function splitUri(uri: string): string[] {
    return uri.split('/').filter(s => s.length > 0);
}

function buildMatchResult(uriParts: string[], pattern: AnyPathPattern[]): PathMatchResult {
    const params: Record<string, string> = {};

    pattern.forEach((part, i) => {
        if (part.type === PATH_TYPE.MATCHING) {
            params[part.captureName] = uriParts[i] ?? '';
        }
    });

    return { params, parts: uriParts };
}