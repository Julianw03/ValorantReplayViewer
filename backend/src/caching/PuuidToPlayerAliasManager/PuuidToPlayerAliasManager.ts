import { Inject, Injectable } from '@nestjs/common';
import { MapDataManager } from '@/caching/base/MapDataManager';
import { PlayerAliasDTO } from '@/caching/AccountNameAndTagLineModule/PlayerAliasDTO';
import { type RiotClientService } from '@/riotclient/RiotClientService';
import { RIOT_CLIENT_SERVICE } from '@/riotclient/RiotClientTokens';
import { PlayerAccountLookupV2NamesetsForPuuidResponse, PluginPlayerAccountApi } from '../../../gen';

@Injectable()
export class PuuidToPlayerAliasManager extends MapDataManager<string, PlayerAccountLookupV2NamesetsForPuuidResponse, PlayerAliasDTO> {


    constructor(
        @Inject(RIOT_CLIENT_SERVICE)
        protected readonly riotClientService: RiotClientService
    ) {
        super();
    }


    public async fetchPlayerAliasData(puuids: string[], maxTimeoutMs: number = 5_000): Promise<Record<string, PlayerAliasDTO>> {
        const needToFetch = puuids.filter((puuid) => puuid != undefined && this.get(puuid) === null);

        if (needToFetch.length > 0) {
            const pluginApi = this.riotClientService.getCachedApi(PluginPlayerAccountApi);
            const resp = await pluginApi.playerAccountLookupV2NamesetsForPuuidsPost(
                { puuids: needToFetch },
                { timeout: maxTimeoutMs }
            );

            const puuidToInfoArray = resp.data?.namesets ?? [];
            for (const entry of puuidToInfoArray) {
                this.setKeyValue(entry.puuid as string, entry);
            }
        }

        const retMap: Record<string, PlayerAliasDTO> = {};
        for (const puuid of puuids) {
            const cached = this.getEntryView(puuid);
            if (cached !== null) {
                retMap[puuid] = cached;
            }
        }

        return retMap;
    }

    protected getViewForValue(value: PlayerAccountLookupV2NamesetsForPuuidResponse | null): PlayerAliasDTO | null {
        if (value === null || !value.alias) return null;
        return value.alias as PlayerAliasDTO;
    }

    protected async resetInternalState(): Promise<void> {
        return;
    }
}