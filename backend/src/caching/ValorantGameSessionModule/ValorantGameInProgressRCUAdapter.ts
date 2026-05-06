import { Inject, Injectable } from '@nestjs/common';
import { SimpleUUID } from '@/caching/ValorantMatchStatsModule/RiotMatchApiResponseDTO';
import type { RiotClientService } from '@/riotclient/RiotClientService';
import { ValorantGameSessionManager } from '@/caching/ValorantGameSessionModule/ValorantGameSessionManager';
import { RCUMessageType } from '@/riotclient/messaging/RCUMessage';
import { MatchStatus } from '@/caching/ValorantGameSessionModule/MatchStatus';
import { RCUMapDataAdapter } from '@/riotclient/adapters/RCUMapDataAdapter';
import { RIOT_CLIENT_SERVICE, RIOT_CLIENT_STATE_DISPATCHING_SERVICE } from '@/riotclient/RiotClientTokens';
import type { RiotClientStateDispatcher } from '@/riotclient/RiotClientStateDispatcher';
import { ForwardedMessage, TrieRCUMessageDispatcher } from '@/riotclient/messaging/trie/TrieRCUMessageDispatcher';
import { AnyPathPattern, parsePatternString } from '@/riotclient/messaging/path/PatternParser';

@Injectable()
export class ValorantGameInProgressRCUAdapter extends RCUMapDataAdapter<ValorantGameSessionManager> {
    private static PATH_PATTERNS = parsePatternString('/riot-messaging-service/v1/messages/ares-core-game/core-game/v1/matches/{matchId}');

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
        const matchId = matchResult.params['matchId'] as SimpleUUID;

        switch (type) {
            case RCUMessageType.UPDATE:
            case RCUMessageType.CREATE:
                this.logger.log('Received match in progress', data);
                this.setKeyValue(matchId, MatchStatus.IN_PROGRESS);
                break;
            case RCUMessageType.DELETE:
            default:
                break;
        }
    }

    protected getPathParts(): AnyPathPattern[] {
        return ValorantGameInProgressRCUAdapter.PATH_PATTERNS;
    }
}
