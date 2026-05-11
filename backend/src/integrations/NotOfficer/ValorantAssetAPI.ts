import { Inject, Injectable, Logger } from '@nestjs/common';
import { VALORANT_API_BASE_URL } from '@/integrations/NotOfficer/ValorantAPITokens';


export interface ResponseWrapper<T> {
    status: number,
    data: T,
}

export interface MapEntry {
    uuid: UUID,
    displayName: string,
    narrativeDescription: string | null,
    coordinates: string | null,
    displayIcon: ExternalURL,
    listViewIcon: ExternalURL,
    listViewIconTall: ExternalURL,
    splash: ExternalURL,
    stylizedBackgroundImage: ExternalURL,
    premierBackgroundImage: ExternalURL,
    assetPath: string,
    mapUrl: string,
}

export interface VersionInfo {
    manifestId: string,
    branch: string,
    version: string,
    buildVersion: string,
    engineVersion: string,
    riotClientVersion: string,
    riotClientBuild: string,
    buildDate: string
}

@Injectable()
export class ValorantAssetAPI {
    protected readonly logger = new Logger(this.constructor.name);

    constructor(
        @Inject(VALORANT_API_BASE_URL)
        protected readonly baseUrl: string,
    ) {
    }

    protected async fetchAndParse<T>(endpoint: string): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        this.logger.debug(`Fetching data from ${url}`);

        const response = await fetch(url);

        if (!response.ok) {
            this.logger.error(`Failed to fetch data from ${url}: ${response.status} ${response.statusText}`);
            throw new Error(`Failed to fetch data.`);
        }

        try {
            const data = await response.json() as ResponseWrapper<T>;
            return data.data;
        } catch (e) {
            this.logger.error(`Failed to parse JSON`, e);
            throw new Error(`Failed to parse response data.`);
        }
    }

    public async getMapList(): Promise<MapEntry[]> {
        return this.fetchAndParse<MapEntry[]>('/v1/maps');
    }

    public async getVersionInfo(): Promise<VersionInfo> {
        return this.fetchAndParse<VersionInfo>('/v1/version');
    }
}