import { Inject, Injectable } from '@nestjs/common';
import { PlayerAliasDTO } from '@/caching/AccountNameAndTagLineModule/PlayerAliasDTO';
import { type RiotClientService } from '@/riotclient/RiotClientService';
import { RIOT_CLIENT_SERVICE } from '@/riotclient/RiotClientTokens';
import { PlayerAccountLookupV2NamesetsForPuuidResponse, PluginPlayerAccountApi } from '../../../gen';
import { AsyncMapDataManager } from '@/caching/base/AsyncMapDataManger';

export type PuuidToPlayerAliasErrorUnion = NetworkRequestError;

class NetworkRequestError extends Error {
    constructor(message: string) {
        super(message);
    }
}

@Injectable()
export class PuuidToPlayerAliasManager extends AsyncMapDataManager<
    string,
    PlayerAccountLookupV2NamesetsForPuuidResponse,
    PlayerAliasDTO,
    PuuidToPlayerAliasErrorUnion
> {
    constructor(
        @Inject(RIOT_CLIENT_SERVICE)
        protected readonly riotClientService: RiotClientService,
    ) {
        super();
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
                return entry;
            }));
        }
    }


    protected async resetInternalState(): Promise<void> {
    }

    protected async fetch(key: string): Promise<PlayerAccountLookupV2NamesetsForPuuidResponse> {
        const pluginApi = this.riotClientService.getCachedApi(PluginPlayerAccountApi);

        const resp = await pluginApi.playerAccountLookupV2NamesetsForPuuidPost(
            { puuid: key },
            { timeout: 5000 });
        return resp.data;
    }

    protected map(value: PlayerAccountLookupV2NamesetsForPuuidResponse): PlayerAliasDTO {
        const alias = value.alias;

        if (!alias || !alias.gameName || !alias.tagLine) {
            throw new Error("Failed to fetch player alias for puuid " + value.puuid);
        }

        return {
            gameName: alias.gameName,
            tagLine: alias.tagLine,
        }
    }
}