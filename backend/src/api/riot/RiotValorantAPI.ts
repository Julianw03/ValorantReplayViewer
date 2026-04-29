import { Inject, Injectable, Logger } from '@nestjs/common';
import { EntitlementTokenManager } from '@/caching/EntitlementTokenModule/EntitlementTokenManager';
import { ProductSessionManager } from '@/caching/ProductSessionManager/ProductSessionManager';
import { ValorantMatchStatsManager } from '@/caching/ValorantMatchStatsModule/ValorantMatchStatsManager';
import { RiotMatchApiResponse } from '@/caching/ValorantMatchStatsModule/RiotMatchApiResponseDTO';
import { ValorantVersionInfoManager } from '@/caching/ValorantVersionInfo/ValorantVersionInfoManager';
import { ConfigService, type ConfigType } from '@nestjs/config';
import { appConfig } from '@/config/configLoader';
import { RegionToDefaultShardMap, SupportedRegion } from '@/config/ConfigV1DTO';

export interface ReplaySummary {
    GameVersion: string;
    Checksum: string;
}

export interface MatchHistoryEntry {
    MatchID: string;
    GameStartTime: number;
    QueueID: string;
}

interface MatchHistoryResponse {
    Subject: string;
    BeginIndex: number;
    EndIndex: number;
    Total: number;
    History: MatchHistoryEntry[];
}

export interface DeploymentContext {
    region: string;
    shard: string;
    version: string;
    puuid: string;
}

export interface ConnectionState {
    subject: string;
    cxnState: string;
    cxnCloseReason: string;
    clientID: string;
    clientVersion: string;
    loopState: string;
    loopStateMetadata: string;
    version: number;
    lastHeartbeatTime: string; // ISO timestamp
    expiredTime: string; // ISO timestamp
    heartbeatIntervalMillis: number;
    playtimeNotification: string;
    playtimeMinutes: number;
    isRestricted: boolean;
    userinfoValidTime: string; // ISO timestamp
    restrictionType: string;
    clientPlatformInfo: ClientPlatformInfo;
    connectionTime: string; // ISO timestamp
    shouldForceInvalidate: boolean;
}

export interface ClientPlatformInfo {
    platformType: string;
    platformOS: string;
    platformOSVersion: string;
    platformChipset: string;
    platformDevice: string;
}

@Injectable()
export class RiotValorantAPI {
    private readonly logger = new Logger(this.constructor.name);
    private readonly regionMap: Record<SupportedRegion, string>;

    constructor(
        @Inject(appConfig.KEY)
        protected readonly config: ConfigType<typeof appConfig>,
        private readonly entitlementTokenManager: EntitlementTokenManager,
        private readonly productSessionManager: ProductSessionManager,
        private readonly versionInfoManager: ValorantVersionInfoManager,
    ) {
        this.regionMap = config.configurations['valorant-api'].sgpHosts;
    }

    private getDeploymentContext(): DeploymentContext {
        const valorantSession = this.productSessionManager.getSessionByProductId('valorant');
        if (!valorantSession) throw new Error('No Valorant session found');

        const releaseVersion = this.versionInfoManager.getView();
        if (!releaseVersion) throw new Error('Version info not yet available');


        const launchArgs = valorantSession.launchConfiguration?.arguments ?? [];
        const deploymentArg = launchArgs.find((a) =>
            a.startsWith(ValorantMatchStatsManager.KEY_ARES_DEPLOYMENT),
        );
        if (!deploymentArg)
            throw new Error('Deployment region not found in launch arguments');


        const region = this.config.overrides['valorant-api'].region ?? deploymentArg.split(
            ValorantMatchStatsManager.KEY_ARES_DEPLOYMENT,
        )[1];
        if (!region) throw new Error('Invalid deployment region value');

        const entitlements = this.entitlementTokenManager.getView();
        if (!entitlements) throw new Error('No entitlement tokens available');

        const shard = this.config.overrides['valorant-api'].shard ?? RegionToDefaultShardMap[region];
        if (!shard) throw new Error('Unable to determine shard for region ' + region);

        return {
            region,
            shard: shard,
            version: releaseVersion.version,
            puuid: entitlements.subject,
        };
    }

    private getAuthHeaders(version: string): Record<string, string> {
        const entitlements = this.entitlementTokenManager.getView()!;
        return {
            Authorization: `Bearer ${entitlements.accessToken}`,
            'X-Riot-Entitlements-JWT': entitlements.token,
            'X-Riot-ClientPlatform':
            ValorantMatchStatsManager.MAGIC_PLATFORM_STRING,
            'X-Riot-ClientVersion': version,
        };
    }

    public async getMatchHistory(
        startIndex = 0,
        endIndex = 20,
    ): Promise<MatchHistoryEntry[]> {
        const { region, version, puuid } = this.getDeploymentContext();
        const url = `${this.getPdApiBase(region)}/match-history/v1/history/${puuid}?startIndex=${startIndex}&endIndex=${endIndex}`;

        const response = await fetch(url, {
            headers: this.getAuthHeaders(version),
        });
        if (!response.ok) {
            throw new Error(
                `Match history request failed with status ${response.status}`,
            );
        }

        const data: MatchHistoryResponse = await response.json();
        return data.History ?? [];
    }

    async getMatchDetails(matchId: string): Promise<RiotMatchApiResponse> {
        const { region, version } = this.getDeploymentContext();
        const url = `${this.getPdApiBase(region)}/match-details/v1/matches/${matchId}`;

        const response = await fetch(url, {
            headers: this.getAuthHeaders(version),
        });
        if (!response.ok) {
            throw new Error(
                `Match details request failed with status ${response.status}`,
            );
        }

        return response.json();
    }

    async getReplaySummary(matchId: string): Promise<ReplaySummary> {
        const { region, version } = this.getDeploymentContext();
        const url = `${this.getSgpApiBase(region)}/match-history-query/v3/product/valorant/matchId/${matchId}/infoType/summary`;

        const response = await fetch(url, {
            headers: this.getAuthHeaders(version),
        });
        if (!response.ok) {
            throw new Error(
                `Replay summary request failed with status ${response.status}`,
            );
        }

        return response.json();
    }

    async downloadReplayFile(matchId: string): Promise<Buffer> {
        const { region, version } = this.getDeploymentContext();
        const url = `${this.getSgpApiBase(region)}/match-history-query/v3/product/valorant/matchId/${matchId}/infoType/replay`;

        const response = await fetch(url, {
            headers: this.getAuthHeaders(version),
        });
        if (!response.ok) {
            throw new Error(
                `Replay download failed with status ${response.status}`,
            );
        }

        return Buffer.from(await response.arrayBuffer());
    }

    async getGameLoopState(): Promise<ConnectionState> {
        const { region, version, puuid, shard } = this.getDeploymentContext();
        const url = `${this.getGlzApiBase(region, shard)}/session/v1/sessions/${puuid}`;

        const response = await fetch(url, {
            headers: this.getAuthHeaders(version),
        });
        if (!response.ok) {
            throw new Error(
                `Game loop state request failed with status ${response.status}`,
            );
        }

        const data = await response.json();
        this.logger.log(`Game loop state response: ${JSON.stringify(data)}`);
        return data;
    }

    public getPdApiBase(deploymentRegion: string): string {
        return `https://pd.${deploymentRegion}.a.pvp.net`;
    }

    public getSgpApiBase(deploymentRegion: string): string {
        const regionMap = this.regionMap[deploymentRegion];
        return `${regionMap}`;
    }

    public getGlzApiBase(deploymentRegion: string, shard: string): string {
        return `https://glz-${deploymentRegion}-1.${shard}.a.pvp.net`;
    }
}
