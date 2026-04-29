import { create } from 'zustand';
import { InjectStates, type InjectStatus, type MapAsset, type MatchStatsResult, type PlayerAlias } from '@/lib/api';
import type { ProductSession } from '#/dto/ProductSession.ts';
import type { MinimalVersionInfo } from '#/dto/MinimalVersionInfo.ts';
import { type DownloadStateDTO } from '#/dto/DownloadStateDTO.ts';

export type EventType =
    | 'StateUpdated'
    | 'KeyValueUpdated';

export type EventMap = {
    StateUpdated: { value: unknown | null };
    KeyValueUpdated: {
        key: PropertyKey;
        value: unknown | null;
    };
};

export type AnyBasicEvent = {
    [K in EventType]: BasicEvent<K>;
}[EventType];

export interface BasicEvent<TType extends EventType> {
    readonly type: TType;
    readonly payload: EventMap[TType];
    readonly timestamp: number;
    readonly source: string;
}

export type EventOf<T extends EventType> = BasicEvent<T>;

export type StateUpdatedEvent<T> =
    Omit<BasicEvent<'StateUpdated'>, 'payload'> & {
    readonly payload: { value: T | null };
};

export type KeyValueUpdatedEvent<K extends PropertyKey, V> =
    Omit<BasicEvent<'KeyValueUpdated'>, 'payload'> & {
    readonly payload: { key: K; value: V | null };
};


interface AppState {
    wsConnected: boolean;
    playerAlias: PlayerAlias | null;

    downloadStates: Record<string, DownloadStateDTO> | null;

    currentInjectState: InjectStatus;
    currentValorantShippingVersion: string | null;

    matchStatsCache: Record<string, MatchStatsResult> | null;

    // Map asset registry keyed by mapUrl (e.g. "/Game/Maps/Ascent/Ascent").
    mapRegistry: Record<string, MapAsset> | null;
    sessionRegistry: Record<string, ProductSession> | null;

    setWsConnected: (connected: boolean) => void;

    // downloadStates mutations
    setDownloadStates: (states: Record<string, DownloadStateDTO> | null) => void;
    setDownloadStat: (matchId: string, downloadState: DownloadStateDTO | null) => void;

    // matchStatsCache mutations
    setMatchStatsCache: (cache: Record<string, MatchStatsResult> | null) => void;
    setMatchStat: (matchId: string, result: MatchStatsResult | null) => void;

    setMapRegistry: (registry: Record<string, MapAsset>) => void;
    setSessionRegistry: (registry: Record<string, ProductSession>) => void;
    setCurrentShippingVersion: (version: string | null) => void;

    /**
     * Routes incoming WebSocket events to per-source handlers.
     * To react to a new manager's events, add an entry to `handlers` keyed
     * by the manager's class name (the value of `event.source`).
     */
    handleWSEvent: (event: AnyBasicEvent) => void;
}

export const useAppStore = create<AppState>((set) => {
    // ---------------------------------------------------------------------------
    // Mutations
    // ---------------------------------------------------------------------------

    const setWsConnected = (connected: boolean) => set({ wsConnected: connected });

    const setDownloadStates = (states: Record<string, DownloadStateDTO> | null) =>
        set({ downloadStates: states });

    /**
     * Upserts or removes a single match's download state.
     * Passing `null` removes the entry from the map.
     * If the map hasn't been hydrated yet (`null`), a deletion is a no-op and
     * an upsert seeds the map with just this entry.
     */
    const setDownloadStat = (matchId: string, downloadState: DownloadStateDTO | null) =>
        set((s) => {
            if (downloadState === null) {
                const prev = s.downloadStates;
                if (prev == null) return {};
                const next = { ...prev };
                delete next[matchId];
                return { downloadStates: next };
            }
            return { downloadStates: { ...(s.downloadStates ?? {}), [matchId]: downloadState } };
        });

    const setMatchStatsCache = (cache: Record<string, MatchStatsResult> | null) =>
        set({ matchStatsCache: cache });

    /**
     * Upserts or removes a single match's stats entry.
     * Passing `null` removes the entry.
     */
    const setMatchStat = (matchId: string, result: MatchStatsResult | null) =>
        set((s) => {
            if (result === null) {
                const prev = s.matchStatsCache;
                if (prev == null) return {};
                const next = { ...prev };
                delete next[matchId];
                return { matchStatsCache: next };
            }
            return { matchStatsCache: { ...(s.matchStatsCache ?? {}), [matchId]: result } };
        });

    const setMapRegistry = (registry: Record<string, MapAsset>) =>
        set({ mapRegistry: registry });

    const setSessionRegistry = (registry: Record<string, ProductSession>) =>
        set({ sessionRegistry: registry });

    const setCurrentShippingVersion = (version: string | null) =>
        set({ currentValorantShippingVersion: version });

    // ---------------------------------------------------------------------------
    // WebSocket event router
    // ---------------------------------------------------------------------------

    const handleWSEvent = (event: AnyBasicEvent) => {
        const handlers: Partial<Record<string, (event: AnyBasicEvent) => void>> = {
            AccountNameAndTagLineManager: (event) => {
                if (event.type !== 'StateUpdated') return;
                set({ playerAlias: event.payload.value as PlayerAlias | null });
            },

            ReplayInjectManager: (event) => {
                if (event.type !== 'StateUpdated') return;
                set({ currentInjectState: event.payload.value as InjectStatus });
            },

            ReplayIOManagerV2: (event) => {
                switch (event.type) {
                    case 'KeyValueUpdated': {
                        // A single match's state changed.
                        const matchId = event.payload.key as string;
                        const dto = event.payload.value as DownloadStateDTO | null;
                        setDownloadStat(matchId, dto);
                        break;
                    }
                    case 'StateUpdated': {
                        // Full snapshot delivered on connect / reconnect.
                        const snapshot = event.payload.value as Record<string, DownloadStateDTO> | null;
                        setDownloadStates(snapshot);
                        break;
                    }
                }
            },

            ValorantMatchStatsManager: (event) => {
                if (event.type !== 'KeyValueUpdated') return;
                const matchId = event.payload.key as string;
                const result = event.payload.value as MatchStatsResult | null;
                setMatchStat(matchId, result);
            },

            ValorantVersionInfoManager: (event) => {
                if (event.type !== 'StateUpdated') return;
                const info = event.payload.value as MinimalVersionInfo | null;
                set({ currentValorantShippingVersion: info?.version ?? null });
            },

            ProductSessionManager: (event) => {
                switch (event.type) {
                    case 'StateUpdated': {
                        const sessions = event.payload.value as Record<string, ProductSession>;
                        if (sessions !== undefined) set({ sessionRegistry: sessions });
                        break;
                    }
                    case 'KeyValueUpdated': {
                        const sessionId = event.payload.key as string;
                        const session = event.payload.value as ProductSession | null;
                        set((s) => {
                            if (session === null) {
                                if (!s.sessionRegistry) return {};
                                const next = { ...s.sessionRegistry };
                                delete next[sessionId];
                                return { sessionRegistry: next };
                            }
                            return {
                                sessionRegistry: {
                                    ...(s.sessionRegistry ?? {}),
                                    [sessionId]: session,
                                },
                            };
                        });
                        break;
                    }
                }
            },
        };

        handlers[event.source]?.(event);
    };

    // ---------------------------------------------------------------------------
    // Initial state
    // ---------------------------------------------------------------------------

    return {
        wsConnected: false,
        playerAlias: null,
        currentValorantShippingVersion: null,
        downloadStates: null,
        matchStatsCache: null,
        mapRegistry: null,
        sessionRegistry: null,
        currentInjectState: {
            state: InjectStates.IDLE,
            targetMatchId: null,
            placeholderMatchId: null,
        },

        setWsConnected,
        setDownloadStates,
        setDownloadStat,
        setMatchStatsCache,
        setMatchStat,
        setMapRegistry,
        setSessionRegistry,
        setCurrentShippingVersion,
        handleWSEvent,
    };
});