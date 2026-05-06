import { Inject, Injectable } from '@nestjs/common';
import { SimpleUUID } from '@/caching/ValorantMatchStatsModule/RiotMatchApiResponseDTO';
import type { RiotClientService } from '@/riotclient/RiotClientService';
import { ValorantGameSessionManager } from '@/caching/ValorantGameSessionModule/ValorantGameSessionManager';
import { RCUMessageType } from '@/riotclient/messaging/RCUMessage';
import { MatchStatus } from '@/caching/ValorantGameSessionModule/MatchStatus';
import { RCUMapDataAdapter } from '@/riotclient/adapters/RCUMapDataAdapter';
import { RIOT_CLIENT_SERVICE, RIOT_CLIENT_STATE_DISPATCHING_SERVICE } from '@/riotclient/RiotClientTokens';
import { ForwardedMessage, TrieRCUMessageDispatcher } from '@/riotclient/messaging/trie/TrieRCUMessageDispatcher';
import { AnyPathPattern, parsePatternString } from '@/riotclient/messaging/path/PatternParser';
import type { RiotClientStateDispatcher } from '@/riotclient/RiotClientStateDispatcher';

interface RMSMessage {
    ackRequired: boolean;
    id: string;
    payload: JsonNode;
    ressource: string;
    service: string;
    timestamp: number;
    version: string;
}

@Injectable()
export class ValorantMatchEndedRCUAdapter extends RCUMapDataAdapter<ValorantGameSessionManager> {
    private static PATH_PATTERNS = parsePatternString('/riot-messaging-service/v1/messages/ares-match-details/match-details/v1/matches');

    constructor(
        @Inject(RIOT_CLIENT_SERVICE)
        protected readonly rcService: RiotClientService,
        protected readonly gameSessionManager: ValorantGameSessionManager,
        @Inject(RIOT_CLIENT_STATE_DISPATCHING_SERVICE)
        stateDispatcher: RiotClientStateDispatcher,
        messageDispatcher: TrieRCUMessageDispatcher,
    ) {
        super(rcService, gameSessionManager, stateDispatcher, messageDispatcher);
    }

    protected async handleRCUEvent(
        {
            message: {
                type,
                data,
            },
            matchResult,
        }: ForwardedMessage,
    ): Promise<void> {
        switch (type) {
            case RCUMessageType.UPDATE:
            case RCUMessageType.CREATE:
                this.logger.log('Received match ended message', data);
                const typedData = data as unknown as RMSMessage;
                const matchId = typedData.payload as SimpleUUID;
                this.logger.log('Received match ended message', data);
                this.gameSessionManager.setKeyValue(matchId, MatchStatus.ENDED);
                break;
            case RCUMessageType.DELETE:
            default:
                break;
        }
    }

    protected getPathParts(): AnyPathPattern[] {
        return ValorantMatchEndedRCUAdapter.PATH_PATTERNS;
    }
}
