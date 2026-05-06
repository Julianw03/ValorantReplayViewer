import { Observable, share, Subject } from 'rxjs';
import { RCUMessage } from '@/riotclient/messaging/RCUMessage';
import { PATH_TYPE } from '@/riotclient/messaging/path/PathPattern';
import { AnyPathPattern } from '@/riotclient/messaging/path/PatternParser';

type TypeStateMappings = {
    [PATH_TYPE.STATIC]: Map<string, TrieNode> | null;
    [PATH_TYPE.MATCHING]: TrieNode | null;
};

export class TrieNode {
    readonly subject = new Subject<RCUMessage>();
    readonly observable: Observable<RCUMessage> = this.subject.pipe(share());

    readonly states: TypeStateMappings = {
        [PATH_TYPE.STATIC]: new Map(),
        [PATH_TYPE.MATCHING]: null,
    };

    public complete() {
        this.subject.complete();
        this.states[PATH_TYPE.MATCHING]?.complete();
        this.states[PATH_TYPE.MATCHING] = null;
        this.states[PATH_TYPE.STATIC]?.forEach(child => child.complete());
        this.states[PATH_TYPE.STATIC] = null;
    }

    public resolveOrAdd(path: AnyPathPattern[]): TrieNode {
        let current: TrieNode = this;

        for (const part of path) {
            switch (part.type) {
                case PATH_TYPE.MATCHING: {
                    current.states[PATH_TYPE.MATCHING] ??= new TrieNode();
                    current = current.states[PATH_TYPE.MATCHING];
                    break;
                }
                case PATH_TYPE.STATIC: {
                    const key = part.pathToMatch;
                    let child = current.states[PATH_TYPE.STATIC]?.get(key);
                    if (child === undefined) {
                        child = new TrieNode();
                        current.states[PATH_TYPE.STATIC]?.set(key, child);
                        current = child;
                    } else {
                        current = child;
                    }
                    break;
                }
            }
        }

        return current;
    }

    public collectMatches(parts: string[]): TrieNode[] {
        if (parts.length === 0) return [this];

        let current: TrieNode[] = [this];

        for (const part of parts) {
            const next: TrieNode[] = [];

            for (const node of current) {
                const staticChild = node.states[PATH_TYPE.STATIC]?.get(part);
                if (staticChild) next.push(staticChild);
                const matchingChild = node.states[PATH_TYPE.MATCHING];
                if (matchingChild) next.push(matchingChild);
            }

            if (next.length === 0) return [];
            current = next;
        }

        return current;
    }
}