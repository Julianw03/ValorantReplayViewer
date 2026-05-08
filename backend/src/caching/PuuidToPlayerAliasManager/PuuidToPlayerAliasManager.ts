import { Inject, Injectable } from '@nestjs/common';
import { PlayerAliasDTO } from '@/caching/AccountNameAndTagLineModule/PlayerAliasDTO';
import { type RiotClientService } from '@/riotclient/RiotClientService';
import { RIOT_CLIENT_SERVICE } from '@/riotclient/RiotClientTokens';
import { PlayerAccountLookupV2NamesetsForPuuidResponse, PluginPlayerAccountApi } from '../../../gen';
import { AsyncMapDataBehavior } from '@/caching/base/behaviors/async/AsyncMapDataBehavior';
import { IMapDataManager } from '@/caching/base/interfaces/IMapDataManager';
import { AsyncResultUnion } from '#/utils/AsyncResult';
import { SimpleMapDataManager } from '@/caching/base/SimpleMapDataManager';
import { SimpleUUID } from '@/caching/ValorantMatchStatsModule/RiotMatchApiResponseDTO';

export type PuuidToPlayerAliasErrorUnion = NetworkRequestError;

class NetworkRequestError extends Error {
    constructor(message: string) {
        super(message);
    }
}

@Injectable()
export class PuuidToPlayerAliasManager extends AsyncMapDataBehavior<
    string,
    PlayerAliasDTO,
    PuuidToPlayerAliasErrorUnion
> {
    protected manager: IMapDataManager<string, PlayerAccountLookupV2NamesetsForPuuidResponse, AsyncResultUnion<PlayerAliasDTO, PuuidToPlayerAliasErrorUnion>>;

    constructor(
        @Inject(RIOT_CLIENT_SERVICE)
        protected readonly riotClientService: RiotClientService,
    ) {
        const base = new SimpleMapDataManager<SimpleUUID, AsyncResultUnion<PlayerAliasDTO, PuuidToPlayerAliasErrorUnion>>();
        super(base);
    }

    public requestBatchFetch(puuids: string[], maxTimeoutMs: number = 5_000): void {
        const pluginApi = this.riotClientService.getCachedApi(PluginPlayerAccountApi);

        const batchPromise = pluginApi
            .playerAccountLookupV2NamesetsForPuuidsPost(
                { puuids },
                { timeout: maxTimeoutMs },
            )
            .then((resp) => resp.data?.namesets ?? []);


        for (const puuid of puuids) {
            this.injectPromise(puuid, batchPromise.then((namesets) => {
                const entry = namesets.find((n) => n.puuid === puuid);
                if (!entry) {
                    throw new NetworkRequestError(`No entry found for puuid ${puuid}`);
                }
                return this.map(entry);
            }));
        }
    }

    protected map(value: PlayerAccountLookupV2NamesetsForPuuidResponse): PlayerAliasDTO {
        const alias = value.alias;

        if (!alias || !alias.gameName || !alias.tagLine) {
            throw new Error('Failed to fetch player alias for puuid ' + value.puuid);
        }

        return {
            gameName: alias.gameName,
            tagLine: alias.tagLine,
        };
    }
}