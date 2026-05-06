import { RiotMatchApiResponse, SimpleUUID } from '@/caching/ValorantMatchStatsModule/RiotMatchApiResponseDTO';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ValorantGameSessionManager } from '@/caching/ValorantGameSessionModule/ValorantGameSessionManager';
import { EmittingMapDataManager } from '@/caching/base/EmittingMapDataManager';
import { SimpleEventBus } from '@/events/SimpleEventBus';
import { AsyncResult, AsyncResultUnion } from '#/utils/AsyncResult';
import { MatchStatus } from '@/caching/ValorantGameSessionModule/MatchStatus';
import { KeyValueUpdatedEvent } from '@/events/BasicEvent';
import { RiotValorantAPIManager } from '@/api/riot/RiotValorantAPIManager';
import { PuuidToPlayerAliasManager } from '@/caching/PuuidToPlayerAliasManager/PuuidToPlayerAliasManager';

@Injectable()
export class ValorantMatchStatsManager
    extends EmittingMapDataManager<
        SimpleUUID,
        AsyncResult<RiotMatchApiResponse, Error>,
        AsyncResultUnion<RiotMatchApiResponse, Error>
    >
    implements OnModuleInit, OnModuleDestroy {
    public static readonly MAGIC_PLATFORM_STRING =
        'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9';
    public static readonly KEY_ARES_DEPLOYMENT = '-ares-deployment=';

    private unsubscribe: (() => void) | null = null;

    constructor(
        protected readonly eventBus: SimpleEventBus,
        protected readonly valorantApi: RiotValorantAPIManager,
        protected readonly playerAliasManager: PuuidToPlayerAliasManager,
    ) {
        super(eventBus);
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

    public async requestMatchFetch(matchId: SimpleUUID): Promise<void> {
        if (this.getEntryView(matchId) !== null) {
            return;
        }
        this.setKeyValue(matchId, AsyncResult.pending());

        try {
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
            this.setKeyValue(matchId, AsyncResult.success(result));
        } catch (error) {
            this.logger.debug(
                `Failed to fetch match data for match ID ${matchId}`,
                error,
            );
            this.setKeyValue(matchId, AsyncResult.failure(error));
        }
    }

    protected async resetInternalState(): Promise<void> {
    }

    protected getViewForValue(
        value: AsyncResult<RiotMatchApiResponse, Error> | null,
    ): AsyncResultUnion<RiotMatchApiResponse, Error> | null {
        if (value === null) return null;
        return { ...value } as AsyncResultUnion<RiotMatchApiResponse, Error>;
    }
}
