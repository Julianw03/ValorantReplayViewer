import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MapEntry, ValorantAssetAPI } from '@/integrations/NotOfficer/ValorantAssetAPI';
import { appConfig } from '@/config/configLoader';
import type { ConfigType } from '@nestjs/config';
import { IMapDataManager } from '@/core/data/interfaces/IMapDataManager';
import { SimpleMapDataManager } from '@/core/data/SimpleMapDataManager';
import { RecomputingMapMappingBehavior } from '@/core/data/behaviors/viewMapping/RecomputingMapMappingBehavior';
import { KeyDataViewable } from '@/core/data/interfaces/capabilities/KeyDataViewable';


export type MapId = string;

export type MapAsset = Omit<MapEntry, 'uuid'>;

@Injectable()
export class MapAssetResolverManager implements KeyDataViewable<MapId, MapAsset>, OnModuleInit {
    protected readonly manager: IMapDataManager<MapId, MapEntry, MapAsset>;
    protected readonly logger = new Logger(this.constructor.name);

    constructor(
        protected readonly valorantAssetAPI: ValorantAssetAPI,
        @Inject(appConfig.KEY)
        protected readonly config: ConfigType<typeof appConfig>,
    ) {
        const base = new SimpleMapDataManager();
        this.manager = new RecomputingMapMappingBehavior(base, MapAssetResolverManager.map);

    }

    private proxyAssetUrl(externalUrl: string): string {
        //TODO: This should be inferred at runtime.
        return `http://127.0.0.1:${this.config.configurations.app.port}/api/v1/assets/proxy?url=${encodeURIComponent(externalUrl)}`;
    }

    private overrideProxyResourcesFor(entry: MapEntry) {
        for (const [key, value] of Object.entries(entry)) {
            if (typeof value === 'string' && value.startsWith('http')) {
                entry[key as keyof MapAsset] = this.proxyAssetUrl(value);
            }
        }
        return entry;
    }

    onModuleInit() {
        this.valorantAssetAPI.getMapList()
            .then(data => {
                const map = {};
                for (const entry of data) {
                    map[entry.mapUrl] = this.overrideProxyResourcesFor(entry);
                }
                this.logger.log('Fetched map list and updated state.');
                this.manager.updateKeyValueBatch(map);
            })
            .catch(err => {
                this.logger.error('Failed to fetch map list on initialization', err);
            });
    }

    protected static map(
        state: MapEntry,
    ): MapAsset {
        return state;
    }

    getKeyView(key: MapId): MapAsset | null {
        return this.manager.getKeyView(key);
    }

    getView(): Record<MapId, MapAsset> | null {
        return this.manager.getView();
    }
}