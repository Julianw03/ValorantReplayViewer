import { Inject, Injectable } from '@nestjs/common';
import { RCUMessageType } from '@/core/riotclient/messaging/RCUMessage';
import type { RiotClientService } from '@/core/riotclient/RiotClientService';
import { ValorantGameSessionManager } from '@/modules/Valorant/ValorantGameSessionModule/ValorantGameSessionManager';
import { MatchStatus } from '@/modules/Valorant/ValorantGameSessionModule/MatchStatus';
import { RIOT_CLIENT_SERVICE, RIOT_CLIENT_STATE_DISPATCHING_SERVICE } from '@/core/riotclient/RiotClientTokens';
import { AnyPathPattern, parsePatternString } from '@/core/riotclient/messaging/path/PatternParser';
import type { RiotClientStateDispatcher } from '@/core/riotclient/RiotClientStateDispatcher';
import { ForwardedMessage, TrieRCUMessageDispatcher } from '@/core/riotclient/messaging/trie/TrieRCUMessageDispatcher';
import { RCUDataAdapter } from '@/core/data/adapters/RCUDataAdapter';

@Injectable()
export class ValorantGameChampSelectRCUAdapter extends RCUDataAdapter<ValorantGameSessionManager> {
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
                this.manager.updateKeyValue(matchId, MatchStatus.CHAMPION_SELECTION);
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
