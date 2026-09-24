import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RCUMessageType } from '@/core/riotclient/messaging/RCUMessage';
import type { RiotClientService } from '@/core/riotclient/RiotClientService';
import { RIOT_CLIENT_SERVICE, RIOT_CLIENT_STATE_DISPATCHING_SERVICE } from '@/core/riotclient/RiotClientTokens';
import type { RiotClientStateDispatcher } from '@/core/riotclient/RiotClientStateDispatcher';
import { ForwardedMessage, TrieRCUMessageDispatcher } from '@/core/riotclient/messaging/trie/TrieRCUMessageDispatcher';
import { AnyPathPattern, parsePatternString } from '@/core/riotclient/messaging/path/PatternParser';
import { RCUDataAdapter } from '@/core/data/adapters/RCUDataAdapter';
import { PluginSocialApi, SocialMultigamePresences, SocialPresenceSessionV1 } from '../../../gen';
import { SocialPresenceManager, MultigamePresence } from '@/modules/SocialPresence/SocialPresenceManager';

@Injectable()
export class SocialPresenceRCUAdapter extends RCUDataAdapter<SocialPresenceManager> {

    private static PATH_PATTERNS = parsePatternString('/social/v1/presences/multigame');

    constructor(
        @Inject(RIOT_CLIENT_SERVICE)
        rcService: RiotClientService,
        manager: SocialPresenceManager,
        @Inject(RIOT_CLIENT_STATE_DISPATCHING_SERVICE)
        stateDispatcher: RiotClientStateDispatcher,
        messageDispatcher: TrieRCUMessageDispatcher,
    ) {
        super(rcService, manager, stateDispatcher, messageDispatcher);
    }

    protected async handleRCUEvent(forward: ForwardedMessage): Promise<void> {
        const type = forward.message.type;
        switch (type) {
            case RCUMessageType.CREATE:
            case RCUMessageType.UPDATE: {
                const body = forward.message.data as unknown as SocialMultigamePresences;
                this.reconcile(body.presences);
                break;
            }
            case RCUMessageType.DELETE: {
                this.manager.deleteState();
                break;
            }
            default:
                break;
        }
    }

    protected async handleConnected(): Promise<void> {
        const api = this.rcService.getCachedApi(PluginSocialApi);
        const resp = await api.socialV1PresencesMultigameGet();
        if (!resp || resp.status !== HttpStatus.OK) {
            this.logger.warn(
                'Failed to fetch initial multigame presence data on RCU connection',
                resp?.status,
            );
            return;
        }

        this.reconcile(resp.data.presences);
    }

    protected getPathParts(): AnyPathPattern[] {
        return SocialPresenceRCUAdapter.PATH_PATTERNS;
    }

    private reconcile(presences: SocialPresenceSessionV1[] | undefined): void {
        const next = SocialPresenceRCUAdapter.toPresenceRecord(presences);
        const nextKeys = Object.keys(next);
        const currentKeys = new Set(Object.keys(this.manager.getView() ?? {}));

        if (nextKeys.length === 0) {
            if (currentKeys.size > 0) {
                this.manager.deleteState();
            }
            return;
        }

        for (const key of currentKeys) {
            if (!(key in next)) {
                this.manager.deleteKey(key);
            }
        }

        for (const key of nextKeys) {
            this.manager.updateKeyValue(key, next[key]);
        }
    }

    private static toPresenceRecord(
        presences: SocialPresenceSessionV1[] | undefined,
    ): Record<MultigamePresence.ProductId, SocialPresenceSessionV1> {
        const record = {} as Record<MultigamePresence.ProductId, SocialPresenceSessionV1>;
        for (const presence of presences ?? []) {
            if (!presence.product) continue;
            record[presence.product] = presence;
        }
        return record;
    }
}
