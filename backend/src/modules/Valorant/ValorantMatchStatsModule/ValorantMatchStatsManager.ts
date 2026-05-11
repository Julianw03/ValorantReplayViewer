import { RiotMatchApiResponse, SimpleUUID } from '@/modules/Valorant/ValorantMatchStatsModule/RiotMatchApiResponseDTO';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ValorantGameSessionManager } from '@/modules/Valorant/ValorantGameSessionModule/ValorantGameSessionManager';
import { SimpleEventBus } from '@/core/events/SimpleEventBus';
import { AsyncResult, AsyncResultUnion } from '#/utils/AsyncResult';
import { MatchStatus } from '@/modules/Valorant/ValorantGameSessionModule/MatchStatus';
import { KeyValueUpdatedEvent } from '@/core/events/BasicEvent';
import { RiotValorantAPIManager } from '@/integrations/riot/RiotValorantAPIManager';
import { PuuidToPlayerAliasManager } from '@/modules/PuuidToPlayerAliasManager/PuuidToPlayerAliasManager';
import { AsyncMapDataBehavior } from '@/core/data/behaviors/async/AsyncMapDataBehavior';
import { SimpleMapDataManager } from '@/core/data/SimpleMapDataManager';
import { EmittingMapDataBehavior } from '@/core/data/behaviors/emission/EmittingMapDataBehavior';

@Injectable()
export class ValorantMatchStatsManager
    extends AsyncMapDataBehavior<SimpleUUID, RiotMatchApiResponse, Error>
    implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(this.constructor.name);
    public static readonly MAGIC_PLATFORM_STRING =
        'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9';
    public static readonly KEY_ARES_DEPLOYMENT = '-ares-deployment=';

    private unsubscribe: (() => void) | null = null;

    constructor(
        protected readonly eventBus: SimpleEventBus,
        protected readonly valorantApi: RiotValorantAPIManager,
        protected readonly playerAliasManager: PuuidToPlayerAliasManager,
    ) {
        const base = new SimpleMapDataManager<SimpleUUID, AsyncResultUnion<RiotMatchApiResponse, Error>>();
        const emitting = new EmittingMapDataBehavior(base, eventBus, ValorantMatchStatsManager.name);
        super(emitting);
    }

    onModuleInit() {
        this.unsubscribe = this.eventBus.subscribeOnSource(
            ValorantGameSessionManager.name,
            this.gameSessionStateChange.bind(this),
        );
    }

    onModuleDestroy() {
        this.unsubscribe?.();
        this.unsubscribe = null;
        this.deleteState();
    }

    public requestMatchFetch(matchId: SimpleUUID) {
        if (this.externalRepresentation.getKeyView(matchId) !== null) {
            return;
        }

        this.injectPromise(matchId, this.fetchMatchData(matchId));
    }

    private gameSessionStateChange(
        event: KeyValueUpdatedEvent<SimpleUUID, MatchStatus>,
    ) {
        if (event.payload.value !== MatchStatus.ENDED) {
            return;
        }

        const matchId = event.payload.key;
        this.requestMatchFetch(matchId);
    }

    private async fetchMatchData(matchId: SimpleUUID) {
        const result = await this.valorantApi.getMatchDetails(matchId);
        const puuids = result.players.map(p => p.subject).filter((p) => p !== undefined);
        this.playerAliasManager.requestBatchFetch(puuids);
        this.logger.debug(
            `Requested player alias batch fetch for match ID ${matchId} with puuids: ${puuids.join(', ')}`,
        );
        const aliasMap = await this.playerAliasManager.getBestEffortBatchedResult(puuids, 5_000);

        for (const player of result.players) {
            const resolvedAlias = aliasMap[player.subject ?? ''];
            if (resolvedAlias) {
                this.logger.debug(
                    `Resolved alias for player with puuid ${player.subject} in match ID ${matchId}: ${resolvedAlias.gameName}#${resolvedAlias.tagLine}`,
                );
                player.gameName = resolvedAlias.gameName;
                player.tagLine = resolvedAlias.tagLine;
            } else {
                this.logger.warn(
                    `Failed to resolve alias for player with puuid ${player.subject} in match ID ${matchId}`,
                );
            }
        }

        this.logger.debug(
            `Received match data for match ID ${matchId}`,
        );

        return result;
    }
}
