import * as LocalLinkResolver from '@/lib/LocalLinkResolver.ts';
import type { ProductSession } from '#/dto/ProductSession.ts';
import type { DownloadStateDTO } from '#/dto/DownloadStateDTO.ts';

export const API_BASE = LocalLinkResolver.resolve('/api/v1', 'http');

// ---- Types ----

export interface MinimalVersionInfo {
    version: string;
}

export interface StorageStatus {
    isSetup: boolean;
    matchCount: number;
    totalSizeBytes: number;
}

export interface TeamSummary {
    teamId: string;
    won: boolean;
    roundsWon: number;
    roundsPlayed: number;
}

export interface PlayerSummary {
    puuid: string;
    gameName: string;
    tagLine: string;
    teamId: string;
    characterId: string;
    kills: number;
    deaths: number;
    assists: number;
    isObserver: boolean;
}

export interface ReplayMetadata {
    formatVersion: number;
    replayFileSize: number;
    downloadInfo: DownloadInfo;
    matchInfo: MatchInfo;
    teams: TeamSummary[];
    players: PlayerSummary[];
}

export interface DownloadInfo {
    downloadedAt: number;
    downloaderId: string;
}

export interface MatchInfo {
    matchId: string;
    mapId: string;
    queueID: string;
    gameVersion: string;
    gameStartMillis: number;
    gameLengthMillis: number;
    isRanked: boolean;
}

export interface MatchHistoryEntry {
    MatchID: string;
    GameStartTime: number;
    QueueID: string;
}

export const InjectStates = {
    IDLE: 'IDLE',
    DOWNLOADING_PLACEHOLDER: 'DOWNLOADING_PLACEHOLDER',
    AWAITING_REPLAY_START: 'AWAITING_REPLAY_START',
    INJECTED: 'INJECTED',
    RESTORING_ORIGINAL_REPLAY: 'RESTORING_ORIGINAL_REPLAY',
    FAILED: 'FAILED',
} as const;

export type InjectState =
    typeof InjectStates[keyof typeof InjectStates];

export interface InjectStatus {
    state: InjectState;
    targetMatchId: string | null;
    placeholderMatchId: string | null;
}

export interface DownloadState {
    type: 'PENDING' | 'SUCCESS' | 'FAILURE';
    error?: { message: string };
}

export interface PlayerAlias {
    gameName: string;
    tagLine: string;
}

// ---- Map assets ----

export interface MapAsset {
    displayName: string;
    narrativeDescription: string | null;
    coordinates: string | null;
    displayIcon: string;
    listViewIcon: string;
    listViewIconTall: string;
    splash: string;
    stylizedBackgroundImage: string;
    premierBackgroundImage: string;
    assetPath: string;
    mapUrl: string;
}

// ---- Match stats (from Riot API via backend cache) ----

export interface RiotMatchPlayerStats {
    score: number;
    roundsPlayed: number;
    kills: number;
    deaths: number;
    assists: number;
}

export interface RiotMatchPlayer {
    subject: string;
    gameName: string;
    tagLine: string;
    teamId: string;
    characterId: string;
    isObserver: boolean;
    stats: RiotMatchPlayerStats;
    competitiveTier: number;
}

export interface RiotMatchTeam {
    teamId: string;
    won: boolean;
    roundsPlayed: number;
    roundsWon: number;
}

export interface RiotMatchInfo {
    matchId: string;
    mapId: string;
    queueID: string;
    gameVersion: string;
    gameLengthMillis: number;
    gameStartMillis: number;
    isRanked: boolean;
}

export interface RiotMatchApiResponse {
    matchInfo: RiotMatchInfo;
    players: RiotMatchPlayer[];
    teams: RiotMatchTeam[] | null;
}

export type MatchStatsResult =
    | { type: 'PENDING' }
    | { type: 'SUCCESS'; data: RiotMatchApiResponse }
    | { type: 'FAILURE'; error: { message: string } }

/** Rewrites an external asset URL to go through the local backend proxy cache. */
export function proxyAssetUrl(externalUrl: string): string {
    return `${API_BASE}/assets/proxy?url=${encodeURIComponent(externalUrl)}`;
}

// ---- Configuration ----

export type SupportedRegion = 'na' | 'latam' | 'eu' | 'ap' | 'kr' | 'br';
export type SupportedShard = 'na' | 'pbe' | 'eu' | 'ap' | 'kr';

export const SUPPORTED_REGIONS: SupportedRegion[] = ['na', 'latam', 'eu', 'ap', 'kr', 'br'];
export const SUPPORTED_SHARDS: SupportedShard[] = ['na', 'pbe', 'eu', 'ap', 'kr'];

export interface ConfigOverrides {
    overrides: {
        'valorant-api': {
            region?: SupportedRegion | null;
            shard?: SupportedShard | null;
        };
        'valorant-version-read': {
            version?: string | null;
        };
    };
}

export interface EffectiveConfig {
    overrides: {
        'valorant-api': {
            region?: SupportedRegion | null;
            shard?: SupportedShard | null;
        };
        'valorant-version-read': {
            version?: string | null;
        };
    };
    configurations: {
        app: {
            port: number;
            'additional-cors-origins': string[];
        };
        'valorant-version-read': {
            'retry-timeout-ms': number;
            regex: string;
        };
    };
}

// ---- HTTP client ----

async function request<T = void>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, options);
    if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
            const body = await response.json();
            message = body.message ?? message;
        } catch {
            // ignore parse errors
        }
        throw new Error(message);
    }
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
        return response.json() as Promise<T>;
    }
    return undefined as T;
}

// ---- API ----

export const api = {
    riotClient: {
        isConnected: () => request<boolean>('/riotclient/status/connected'),
        connect: () => request('/riotclient/connect', { method: 'POST' }),
    },
    application: {
        getVersion: () => request<string>('/application/version'),
    },
    valorantVersionInfo: {
        get: () => request<MinimalVersionInfo>('/caching/valorant-version-info'),
    },
    storage: {
        getAllDownloadStates: () => request<Record<string, DownloadStateDTO>>('/plugins/replay/storage/download-states'),
        getStatus: () => request<StorageStatus>('/plugins/replay/storage/status'),
        setup: () => request('/plugins/replay/storage', { method: 'POST' }),
        teardown: () => request('/plugins/replay/storage', { method: 'DELETE' }),
        listMatches: () => request<ReplayMetadata[]>('/plugins/replay/storage/matches'),
        deleteMatch: (matchId: string) =>
            request(`/plugins/replay/storage/matches/${matchId}`, { method: 'DELETE' }),
        uploadReplay: (file: File, override = true) => {
            const formData = new FormData();
            formData.append('file', file);
            return request(`/plugins/replay/storage/matches?override=${override}`, { method: 'POST', body: formData });
        },
    },
    remote: {
        getRecentMatches: (offset = 0, limit = 10) =>
            request<MatchHistoryEntry[]>(
                `/plugins/replay/remote/matches/recent?offset=${offset}&limit=${limit}`,
            ),
        triggerDownload: (matchId: string) =>
            request(`/plugins/replay/remote/matches/recent/${matchId}/download`, { method: 'POST' }),
        retryDownload: (matchId: string) =>
            request(`/plugins/replay/remote/matches/recent/${matchId}/download/retry`, { method: 'POST' }),
        getDownloadState: (matchId: string) =>
            request<DownloadStateDTO | null>(
                `/plugins/replay/remote/matches/recent/${matchId}/download/state`,
            ),
    },
    injector: {
        getStatus: () => request<InjectStatus>('/plugins/replay/injector/status'),
        startInject: (matchId: string) =>
            request(`/plugins/replay/injector/matches/${matchId}`, { method: 'POST' }),
        cancelInject: () => request('/plugins/replay/injector', { method: 'DELETE' }),
    },
    account: {
        getAlias: () => request<PlayerAlias>('/caching/account-name-and-tag-line/active'),
    },
    sessions: {
        getAllProductSessions: () => request<Record<string, ProductSession>>('/caching/product-sessions'),
    },
    assets: {
        getAllMaps: () => request<Record<string, MapAsset>>('/assets/maps/'),
    },
    matchStats: {
        getById: (matchId: string) =>
            request<MatchStatsResult>(`/caching/valorant-game-stats/${matchId}`),
        triggerFetch: (matchId: string) =>
            request(`/caching/valorant-game-stats/${matchId}/fetch`, { method: 'POST' }),
    },
    config: {
        getCurrent: () => request<EffectiveConfig>('/configuration/current'),
        getOverrides: () => request<ConfigOverrides>('/configuration/overrides'),
        saveOverrides: (overrides: ConfigOverrides) =>
            request<ConfigOverrides>('/configuration/overrides', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(overrides),
            }),
        deleteOverrides: () => request('/configuration/overrides', { method: 'DELETE' }),
    },
} as const;
