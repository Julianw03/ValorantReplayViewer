import { Inject, Injectable } from '@nestjs/common';
import { RCUMessageType } from '@/riotclient/messaging/RCUMessage';
import { RIOT_CLIENT_SERVICE, RIOT_CLIENT_STATE_DISPATCHING_SERVICE } from '@/riotclient/RiotClientTokens';
import { type RiotClientService } from '@/riotclient/RiotClientService';
import { AresSessionPayload, ValorantGameLoopManager } from '@/caching/ValorantGameLoop/ValorantGameLoopManager';
import { RiotValorantAPIManager } from '@/api/riot/RiotValorantAPIManager';
import type { RiotClientStateDispatcher } from '@/riotclient/RiotClientStateDispatcher';
import { ForwardedMessage, TrieRCUMessageDispatcher } from '@/riotclient/messaging/trie/TrieRCUMessageDispatcher';
import { AnyPathPattern, parsePatternString } from '@/riotclient/messaging/path/PatternParser';
import { RCUDataAdapter } from '@/caching/base/adapters/RCUDataAdapter';

interface RmsEnvelope {
    ackRequired: boolean;
    id: string;
    payload: string;
    resource: string;
    service: string;
    timestamp: number;
    version: string;
}

@Injectable()
export class ValorantGameLoopRCUAdapter
    extends RCUDataAdapter<ValorantGameLoopManager> {
    private static PATH_PATTERNS = parsePatternString('/riot-messaging-service/v1/message/ares-session/v1/sessions/{sessionId}');

    constructor(
        @Inject(RIOT_CLIENT_SERVICE)
        rcService: RiotClientService,
        manager: ValorantGameLoopManager,
        protected readonly valApi: RiotValorantAPIManager,
        @Inject(RIOT_CLIENT_STATE_DISPATCHING_SERVICE)
        stateDispatcher: RiotClientStateDispatcher,
        messageDispatcher: TrieRCUMessageDispatcher,
    ) {
        super(rcService, manager, stateDispatcher, messageDispatcher);
    }

    protected async handleRCUEvent(
        forward: ForwardedMessage,
    ): Promise<void> {
        const type = forward.message.type;
        const data = forward.message.data;
        switch (type) {
            case RCUMessageType.UPDATE:
            case RCUMessageType.CREATE:
                break;
            case RCUMessageType.DELETE:
            default:
                return;
        }
        const envelope = data as unknown as RmsEnvelope;

        let payload: AresSessionPayload = JSON.parse(
            envelope.payload,
        ) as unknown as AresSessionPayload;

        this.manager.updateValue(payload.loopState);
    }

    private async fetchAndSetGameLoop(): Promise<void> {
        try {
            const data = await this.valApi.getGameLoopState();
            this.manager.updateValue(data.loopState);
        } catch (error) {
            this.logger.warn('Failed to fetch game loop state', error);
        }
    }

    async handleDisconnected(): Promise<void> {
        this.manager.deleteState();
    }

    protected getPathParts(): AnyPathPattern[] {
        return ValorantGameLoopRCUAdapter.PATH_PATTERNS;
    }
}
