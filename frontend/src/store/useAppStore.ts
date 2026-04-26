import { create } from 'zustand';
import { type InjectState, InjectStates, type MapAsset, type MatchStatsResult, type PlayerAlias } from '@/lib/api';
import type { ProductSession } from '#/dto/ProductSession.ts';
import type { MinimalVersionInfo } from '#/dto/MinimalVersionInfo.ts';

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

    // Tracks which matchIds have had a download triggered this session.
    // Used to enable the per-match download state query lazily.
    triggeredMatchIds: string[];

    currentInjectState: InjectState;
    currentValorantShippingVersion: string | null;

    // WS-pushed match stats cache keyed by matchId.
    matchStatsCache: Record<string, MatchStatsResult> | null;

    // Map asset registry keyed by mapUrl (e.g. "/Game/Maps/Ascent/Ascent").
    mapRegistry: Record<string, MapAsset> | null;
    sessionRegistry: Record<string, ProductSession> | null;

    setWsConnected: (connected: boolean) => void;
    addTriggeredMatch: (matchId: string) => void;
    setMatchStat: (matchId: string, result: MatchStatsResult) => void;
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
    const state = {
        wsConnected: false,
        playerAlias: null,
        currentValorantShippingVersion: null,
        triggeredMatchIds: [],
        matchStatsCache: null,
        mapRegistry: null,
        sessionRegistry: null,
        currentInjectState: InjectStates.IDLE,

        setWsConnected: (connected: boolean) => set({ wsConnected: connected }),

        addTriggeredMatch: (matchId: string) =>
            set((s) => ({
                triggeredMatchIds: s.triggeredMatchIds.includes(matchId)
                    ? s.triggeredMatchIds
                    : [...s.triggeredMatchIds, matchId],
            })),

        setMatchStat: (matchId: string, result: MatchStatsResult) =>
            set((s) => {
                const prev = s.matchStatsCache;

                return { matchStatsCache: { ...(prev ?? {}), [matchId]: result } };
            }),

        setMapRegistry: (registry: Record<string, MapAsset>) => set({ mapRegistry: registry }),

        setSessionRegistry: (registry: Record<string, ProductSession>) => set({ sessionRegistry: registry }),

        setCurrentShippingVersion: (version: string | null) => set({ currentValorantShippingVersion: version }),
    };

    const handleWSEvent = (event: AnyBasicEvent) => {
        const handlers: Partial<Record<string, (v: AnyBasicEvent) => void>> = {
            AccountNameAndTagLineManager: (event: AnyBasicEvent) => {
                if (event.type !== 'StateUpdated') return;
                const value = event.payload.value as PlayerAlias | null;
                set({ playerAlias: value });
            },
            ReplayInjectManager: (event: AnyBasicEvent) => {
                if (event.type !== 'StateUpdated') return;
                const injectState = event.payload.value as InjectState | null;
                set({ currentInjectState: injectState ?? InjectStates.IDLE });
            },
            ValorantMatchStatsManager: (event: AnyBasicEvent) => {
                if (event.type !== 'KeyValueUpdated') return;
                const matchId = event.payload.key as string;
                const result = event.payload.value as MatchStatsResult | null;
                if (result !== null && result !== undefined) {
                    state.setMatchStat(matchId, result);
                }
            },
            ValorantVersionInfoManager: (event: AnyBasicEvent) => {
                if (event.type !== 'StateUpdated') return;
                console.log('Received ValorantVersionInfoManager event: ', event);
                const currentVersion = event.payload.value as MinimalVersionInfo | null;
                set({ currentValorantShippingVersion: currentVersion?.version ?? null });
            },
            ProductSessionManager: (event: AnyBasicEvent) => {
                switch (event.type) {
                    case 'StateUpdated': {
                        const currentSessions = event.payload.value as Record<string, ProductSession>;
                        if (currentSessions !== undefined) {
                            set({ sessionRegistry: currentSessions });
                        }
                        break;
                    }
                    case 'KeyValueUpdated': {
                        const sessionId = event.payload.key as string;
                        const session = event.payload.value as ProductSession | null;
                        if (session) {
                            console.log(`Updating session registry with new/updated session ${sessionId}`);
                            set((s) => {
                                const prev = s.sessionRegistry;
                                if (prev == null) return  { sessionRegistry: null };
                                return { sessionRegistry: { ...prev, [sessionId]: session } };
                            });
                        }
                        if (session === null) {
                            console.log('Removing session from registry with id ', sessionId);
                            set((s) => {
                                if (!s.sessionRegistry) return { sessionRegistry: null};
                                const newRegistry = { ...s.sessionRegistry };
                                delete newRegistry[sessionId];
                                return { sessionRegistry: newRegistry };
                            });
                        }
                        break;
                    }
                }
            },
        };

        handlers[event.source]?.(event);
    };


    return ({
        ...state,
        handleWSEvent,
    });
});
