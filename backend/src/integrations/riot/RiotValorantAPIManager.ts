import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EntitlementTokenManager } from '@/modules/EntitlementTokenModule/EntitlementTokenManager';
import { ProductSessionManager } from '@/modules/ProductSessionModule/ProductSessionManager';
import { RiotMatchApiResponse } from '@/modules/Valorant/ValorantMatchStatsModule/RiotMatchApiResponseDTO';
import { ValorantVersionInfoManager } from '@/modules/Valorant/ValorantVersionInfo/ValorantVersionInfoManager';
import { type ConfigType } from '@nestjs/config';
import { appConfig } from '@/config/configLoader';
import { ProductSessionDTO } from '@/modules/ProductSessionModule/ProductSessionDTO';
import { SimpleEventBus } from '@/core/events/SimpleEventBus';
import { RegionToDefaultShardMap } from '@/config/ConfigV1DTO';
import { combineLatest, fromEventPattern, Subscription } from 'rxjs';
import { MinimalVersionInfoDTO } from '@/modules/Valorant/ValorantVersionInfo/MinimalVersionInfoDTO';
import { IMapDataManager } from '@/core/data/interfaces/IMapDataManager';
import { SimpleMapDataManager } from '@/core/data/SimpleMapDataManager';
import { IObjectDataManager } from '@/core/data/interfaces/IObjectDataManager';
import { EmittingObjectDataBehavior } from '@/core/data/behaviors/emission/EmittingObjectDataBehavior';
import { SimpleObjectDataManager } from '@/core/data/SimpleObjectDataManager';
import { EventType } from '@/core/events/EventTypes';
import { RiotValorantAPIReadyState } from '@/integrations/riot/RiotValorantAPIReadyState';

export enum ValorantServiceUrl {
    ACCOUNT_XP = 'ACCOUNT_XP',
    AGGSTATS = 'AGGSTATS',
    AGS = 'AGS',
    AVS = 'AVS',
    CONTENT = 'CONTENT',
    CONTRACTS = 'CONTRACTS',
    CONTRACT_DEFINITIONS = 'CONTRACT_DEFINITIONS',
    COREGAME = 'COREGAME',
    DAILY_TICKET = 'DAILY_TICKET',
    ESPORTS = 'ESPORTS',
    EXPERIMENTATION = 'EXPERIMENTATION',
    FAVORITES = 'FAVORITES',
    GALBS_QUERY = 'GALBS_QUERY',
    GAME_AGNOSTIC_MATCH_HISTORY = 'GAME_AGNOSTIC_MATCH_HISTORY',
    LATENCY = 'LATENCY',
    LOGINQUEUE = 'LOGINQUEUE',
    MASS_REWARDS = 'MASS_REWARDS',
    MATCH_DETAILS = 'MATCHDETAILS',
    MATCH_HISTORY = 'MATCHHISTORY',
    MATCHMAKING = 'MATCHMAKING',
    TOURNAMENTS = 'TOURNAMENTS',
    MMR = 'MMR',
    NAME = 'NAME',
    PARTY = 'PARTY',
    PATCHNOTES = 'PATCHNOTES',
    PERSONALIZATION = 'PERSONALIZATION',
    PLAYERFEEDBACK = 'PLAYERFEEDBACK',
    PREGAME = 'PREGAME',
    PREMIER = 'PREMIER',
    PROGRESSION = 'PROGRESSION',
    // Your shop maybe ?
    PURCHASEMERCHANT = 'PURCHASEMERCHANT',
    REPLAY_CATALOG = 'REPLAY_CATALOG',
    RESTRICTIONS = 'RESTRICTIONS',
    SESSION = 'SESSION',
    SOCIAL_INTEGRATION = 'SOCIAL_INTEGRATION',
    STORE = 'STORE',
}

const SERVICEURL_PREFIX = 'SERVICEURL_' as const;
type RemoteConfigEntry = `${typeof SERVICEURL_PREFIX}${keyof typeof ValorantServiceUrl}`;

type RemoteConfig = {
    'LastApplication': string;
    'Collapsed': Record<RemoteConfigEntry, string>
}

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
export class RiotValorantAPIManager implements OnModuleInit, OnModuleDestroy {
    protected static readonly MAGIC_PLATFORM_STRING =
        'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9';
    protected static readonly KEY_ARES_DEPLOYMENT = '-ares-deployment=';

    private readonly serviceUrls: IMapDataManager<ValorantServiceUrl, string, string>;
    private readonly readyState: IObjectDataManager<RiotValorantAPIReadyState, RiotValorantAPIReadyState>;
    protected readonly logger = new Logger(this.constructor.name);
    private subscription: Subscription | null = null;

    private readonly sessionLaunch$ = fromEventPattern<[string, ProductSessionDTO]>(
        (handler) => ProductSessionManager.onNewSessionLaunch({
            eventBus: this.eventBus,
            productId: 'valorant',
            callback: (sessionId: string, session: ProductSessionDTO) => handler([sessionId, session]),
        }),
        (_handler, unsubscribe) => unsubscribe(),
    );

    private readonly versionInfo$ = fromEventPattern<MinimalVersionInfoDTO>(
        (handler) => ValorantVersionInfoManager.onValorantVersionReady(this.eventBus, handler),
        (_handler, unsubscribe) => unsubscribe(),
    );

    constructor(
        @Inject(appConfig.KEY)
        protected readonly config: ConfigType<typeof appConfig>,
        private readonly entitlementTokenManager: EntitlementTokenManager,
        private readonly versionInfoManager: ValorantVersionInfoManager,
        private readonly eventBus: SimpleEventBus,
    ) {
        this.serviceUrls = new SimpleMapDataManager();
        const base = new SimpleObjectDataManager<RiotValorantAPIReadyState>();
        base.updateValue(RiotValorantAPIReadyState.NOT_READY);
        this.readyState = new EmittingObjectDataBehavior(base, eventBus, RiotValorantAPIManager.name);
    }

    onModuleInit() {
        this.subscription = combineLatest([
            this.sessionLaunch$,
            this.versionInfo$,
        ]).subscribe({
            next: ([[sessionId, session], versionInfo]) => {
                this.handleNewValorantSession(sessionId, session, versionInfo);
            },
            error: (err) => this.logger.error(err),
        });
    }

    onModuleDestroy() {
        this.readyState.updateValue(RiotValorantAPIReadyState.NOT_READY);
        this.subscription?.unsubscribe();
        this.subscription = null;
    }

    private handleNewValorantSession(sessionId: string, valorantSession: ProductSessionDTO, versionInfo: MinimalVersionInfoDTO) {
        const authHeaders = this.getAuthHeaders(versionInfo.version);

        const launchArgs = valorantSession.launchConfiguration?.arguments ?? [];
        const deploymentArg = launchArgs.find((a) =>
            a.startsWith(RiotValorantAPIManager.KEY_ARES_DEPLOYMENT),
        );
        if (!deploymentArg)
            throw new Error('Deployment region not found in launch arguments');

        const region = this.config.overrides['valorant-api'].region ?? deploymentArg.split(
            RiotValorantAPIManager.KEY_ARES_DEPLOYMENT,
        )[1];
        if (!region) throw new Error('Invalid deployment region value');

        const shard = this.config.overrides['valorant-api'].shard ?? RegionToDefaultShardMap[region];
        if (!shard) throw new Error('Unable to determine shard for region ' + region);

        const serviceUrl = `https://shared.${shard}.a.pvp.net/v1/config/${region}`;
        fetch(serviceUrl, { headers: authHeaders })
            .then(response => response.json())
            .then(data => {
                this.logger.log(`Fetched remote config for region ${region}`, data);
                const raw = data as RemoteConfig;
                Object.entries(raw.Collapsed).forEach(([key, value]) => {
                    if (key.startsWith(SERVICEURL_PREFIX)) {
                        const normalizedKey = key.substring(SERVICEURL_PREFIX.length);
                        if (!Object.values(ValorantServiceUrl).includes(normalizedKey as ValorantServiceUrl)) {
                            this.logger.warn(`Received unknown service URL key: ${normalizedKey}`);
                            return;
                        }
                        this.serviceUrls.updateKeyValue(normalizedKey as ValorantServiceUrl, value);
                    }
                });
                this.logger.debug('Setting state as ready');
                this.readyState.updateValue(RiotValorantAPIReadyState.READY);
            })
            .catch(e => this.logger.error(e));
    }


    private getDeploymentContext(): DeploymentContext {
        const releaseVersion = this.versionInfoManager.getView();
        if (!releaseVersion) throw new Error('Version info not yet available');


        const entitlements = this.entitlementTokenManager.getView();
        if (!entitlements) throw new Error('No entitlement tokens available');

        return {
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
            RiotValorantAPIManager.MAGIC_PLATFORM_STRING,
            'X-Riot-ClientVersion': version,
        };
    }

    public async getMatchHistory(
        startIndex = 0,
        endIndex = 20,
    ): Promise<MatchHistoryEntry[]> {
        const { version, puuid } = this.getDeploymentContext();
        const url = this.createUrl(ValorantServiceUrl.MATCH_HISTORY, `match-history/v1/history/${puuid}`);
        url.searchParams.set('startIndex', startIndex.toString());
        url.searchParams.set('endIndex', endIndex.toString());

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
        const { version } = this.getDeploymentContext();
        const url = this.createUrl(ValorantServiceUrl.MATCH_DETAILS, `match-details/v1/matches/${matchId}`);

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
        const { version } = this.getDeploymentContext();
        const url = this.createUrl(ValorantServiceUrl.GAME_AGNOSTIC_MATCH_HISTORY, `match-history-query/v3/product/valorant/matchId/${matchId}/infoType/summary`);

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
        const { version } = this.getDeploymentContext();
        const url = this.createUrl(ValorantServiceUrl.GAME_AGNOSTIC_MATCH_HISTORY, `match-history-query/v3/product/valorant/matchId/${matchId}/infoType/replay`);

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
        const { version, puuid } = this.getDeploymentContext();
        const url = this.createUrl(ValorantServiceUrl.SESSION, `session/v1/sessions/${puuid}`);

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

    public createUrl = (endpoint: ValorantServiceUrl, path: string) => {
        const base = this.serviceUrls.getKeyView(endpoint);
        if (!base) {
            throw new Error(`No base URL found for ${endpoint}. Maybe not ready yet?`);
        }
        return new URL(path, base);
    };

    static onValorantAPIReady(eventBus: SimpleEventBus, handler: () => void): () => void {
        return eventBus.subscribeOnSource(RiotValorantAPIManager.name, event => {
            if (event.type === EventType.StateUpdated) {
                const payload = event.payload;
                if (payload.value === RiotValorantAPIReadyState.READY) {
                    handler();
                }
            }
        });
    }
}
