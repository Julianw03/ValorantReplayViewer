import { Inject, Injectable } from '@nestjs/common';
import { RCUMessageType } from '@/riotclient/messaging/RCUMessage';
import type { RiotClientService } from '@/riotclient/RiotClientService';
import { ValorantGameSessionManager } from '@/caching/ValorantGameSessionModule/ValorantGameSessionManager';
import { MatchStatus } from '@/caching/ValorantGameSessionModule/MatchStatus';
import { RCUMapDataAdapter } from '@/riotclient/adapters/RCUMapDataAdapter';
import { RIOT_CLIENT_SERVICE, RIOT_CLIENT_STATE_DISPATCHING_SERVICE } from '@/riotclient/RiotClientTokens';
import { AnyPathPattern, parsePatternString } from '@/riotclient/messaging/path/PatternParser';
import type { RiotClientStateDispatcher } from '@/riotclient/RiotClientStateDispatcher';
import { ForwardedMessage, TrieRCUMessageDispatcher } from '@/riotclient/messaging/trie/TrieRCUMessageDispatcher';

@Injectable()
export class ValorantGameChampSelectRCUAdapter extends RCUMapDataAdapter<ValorantGameSessionManager> {
    private static PATH_PATTERNS = parsePatternString('/riot-messaging-service/v1/message/ares-pregame/pregame/v1/matches/{matchId}');

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
        forward: ForwardedMessage,
    ): Promise<void> {
        const type = forward.message.type;
        const data = forward.message.data;
        const matchId = forward.matchResult.params['matchId'];

        switch (type) {
            case RCUMessageType.UPDATE:
            case RCUMessageType.CREATE:
                this.logger.log('Received champ select start message', data);
                this.setKeyValue(matchId, MatchStatus.CHAMPION_SELECTION);
                break;
            case RCUMessageType.DELETE:
            default:
                break;
        }
    }

    protected getPathParts(): AnyPathPattern[] {
        return ValorantGameChampSelectRCUAdapter.PATH_PATTERNS;
    }
}
