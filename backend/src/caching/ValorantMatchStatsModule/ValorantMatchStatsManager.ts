import { RiotMatchApiResponse, SimpleUUID } from '@/caching/ValorantMatchStatsModule/RiotMatchApiResponseDTO';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ValorantGameSessionManager } from '@/caching/ValorantGameSessionModule/ValorantGameSessionManager';
import { EmittingMapDataManager } from '@/caching/base/EmittingMapDataManager';
import { SimpleEventBus } from '@/events/SimpleEventBus';
import { AsyncResult, AsyncResultUnion } from '#/utils/AsyncResult';
import { MatchStatus } from '@/caching/ValorantGameSessionModule/MatchStatus';
import { KeyValueUpdatedEvent } from '@/events/BasicEvent';
import { RiotValorantAPI } from '@/api/riot/RiotValorantAPI';

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
        protected readonly valorantApi: RiotValorantAPI,
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

    public requestMatchFetch(matchId: SimpleUUID): void {
        if (this.getEntryView(matchId) !== null) {
            return;
        }
        this.setKeyValue(matchId, AsyncResult.pending());
        this.valorantApi
            .getMatchDetails(matchId)
            .then((data) => {
                this.logger.debug(
                    `Received match data for match ID ${matchId}`
                );
                this.setKeyValue(matchId, AsyncResult.success(data));
            })
            .catch((e) => {
                this.logger.debug(
                    `Failed to fetch match data for match ID ${matchId}`,
                    e,
                );
                this.setKeyValue(matchId, AsyncResult.failure(e));
            });
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
