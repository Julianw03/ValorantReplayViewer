import * as LocalLinkResolver from '@/lib/LocalLinkResolver.ts';
import type { DownloadStateDTO } from '#/schemas/DownloadState.schema.ts';
import type { GUID } from '#/schemas/GUIDSchema.ts';
import type { PlayerAliasDTO } from '#/schemas/PlayerAlias.schema.ts';
import type { ProductSessionDTO } from '#/schemas/ProductSession.schema.ts';
import type { PlayerUuidDTO } from '#/schemas/PlayerUuid.schema.ts';
import type { MapAssetDTO } from '#/schemas/assets/MapAssetDTO.ts';
import type { AgentAssetDTO } from '#/schemas/assets/AgentAssetDTO.ts';
import type { WeaponAssetDTO } from '#/schemas/assets/WeaponAssetDTO.ts';
import type { GearAssetDTO } from '#/schemas/assets/GearAssetDTO.ts';
import type { ReplayMetadataV2, RiotMatchMetadata } from '#/schemas/ReplayFormatV2.schema.ts';
import type { MinimalVersionInfo } from '#/dto/MinimalVersionInfo.ts';
import type { StorageStatusDTO } from '#/schemas/StorageStatusDTO.ts';
import type { ReplayImportRequest } from '#/schemas/upload/ImportReplay.schema.ts';
import type { SocialPresence } from '#/schemas/SocialPresence/SocialPresence.schema.ts';

export const API_BASE = LocalLinkResolver.resolve('/api/v1', 'http');

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

// ---- Match stats (from Riot API via backend cache) ----


export type MatchStatsResult =
    | { type: 'PENDING' }
    | { type: 'SUCCESS'; data: RiotMatchMetadata }
    | { type: 'FAILURE'; error: { message: string } }


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

/**
 * Like `request`, but for endpoints that return a bare `text/plain` / `text/html`
 * body rather than JSON (e.g. the game-loop state string). Maps 404 to `null`.
 */
async function requestText(path: string, options?: RequestInit): Promise<string | null> {
    const response = await fetch(`${API_BASE}${path}`, options);
    if (response.status === 404) {
        return null;
    }
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
    const text = await response.text();
    return text.length > 0 ? text : null;
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
        getStatus: () => request<StorageStatusDTO>('/plugins/replay/storage/status'),
        setup: () => request('/plugins/replay/storage', { method: 'POST' }),
        teardown: () => request('/plugins/replay/storage', { method: 'DELETE' }),
        listMatches: () => request<ReplayMetadataV2[]>('/plugins/replay/storage/matches'),
        getMetadata: (matchId: string) => request<ReplayMetadataV2>(`/plugins/replay/storage/matches/${matchId}/metadata`),
        deleteMatch: (matchId: string) =>
            request(`/plugins/replay/storage/matches/${matchId}`, { method: 'DELETE' }),
        importReplay: (file: File, data: ReplayImportRequest, override = true) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('data', JSON.stringify(data));
            return request(`/plugins/replay/storage/import?override=${override}`, { method: 'POST', body: formData });
        },
    },
    matchHistory: {
        getRecentMatches: ({ after, limit }: { after: GUID | null, limit: number }) => {
            const params = new URLSearchParams();
            if (after) {
                params.set('after', after);
            }
            params.set('limit', limit.toString());
            return request<RiotMatchMetadata[]>(`/plugins/history/matches/recent?${params}`);
        },
        getNewMatches: ({ after, limit }: { after: GUID, limit: number }) => {
            const params = new URLSearchParams();
            params.set('since', after.toString());
            params.set('limit', limit.toString());
            return request<RiotMatchMetadata[]>(`/plugins/history/matches/new?${params}`);
        },
    },
    remote: {
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
        getAlias: () => request<PlayerAliasDTO>('/caching/riot-account/alias'),
        getPuuid: () => request<PlayerUuidDTO>('/caching/riot-account/puuid'),
    },
    sessions: {
        getAllProductSessions: () => request<Record<string, ProductSessionDTO>>('/caching/product-sessions'),
    },
    assets: {
        getAllMaps: () => request<Record<string, MapAssetDTO>>('/assets/maps/'),
        getAllAgents: () => request<Record<string, AgentAssetDTO>>('/assets/agents'),
        getAllWeapons: () => request<Record<string, WeaponAssetDTO>>('/assets/weapons'),
        getAllGear: () => request<Record<string, GearAssetDTO>>('/assets/gear'),
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
    processControl: {
        shutdown: () => request('/process-control/shutdown', { method: 'POST' }),
    },
    gameLoop: {
        getState: () => requestText('/caching/valorant-loop-session/state'),
    },
    socialPresence: {
        getAll: () => request<Record<string, SocialPresence> | null>('/caching/valorant/multigame-presences'),
    },
} as const;
