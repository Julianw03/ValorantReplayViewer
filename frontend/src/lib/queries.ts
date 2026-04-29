import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ConfigOverrides, MapAsset, MatchStatsResult } from '@/lib/api';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import type { ProductSession } from '#/dto/ProductSession.ts';
import { DownloadState, type DownloadStateDTO } from '#/dto/DownloadStateDTO.ts';

// ---- Query keys ----

export const queryKeys = {
    isConnected: ['isConnected'] as const,
    storageStatus: ['storageStatus'] as const,
    storedMatches: ['storedMatches'] as const,
    currentShippingVersion: ['currentShippingVersion'] as const,
    recentMatches: (offset: number, limit: number) => ['recentMatches', offset, limit] as const,
    downloadStates: ['downloadStates'] as const,
    injectStatus: ['injectStatus'] as const,
    matchStats: (matchId: string) => ['matchStats', matchId] as const,
    mapRegistry: ['mapRegistry'] as const,
    productSessionRegistry: ['productSessionRegistry'] as const,
    effectiveConfig: ['effectiveConfig'] as const,
    configOverrides: ['configOverrides'] as const,
} as const;

// ---- Riot Client ----

export function useIsConnected() {
    return useQuery({
        queryKey: queryKeys.isConnected,
        queryFn: () => api.riotClient.isConnected(),
        refetchInterval: (query) => (query.state.data === false ? 2000 : false),
        staleTime: 0,
        retry: 2,
    });
}

export function useConnect() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => api.riotClient.connect(),
        onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.isConnected }),
    });
}

// ---- Storage ----

export function useStorageStatus() {
    return useQuery({
        queryKey: queryKeys.storageStatus,
        queryFn: () => api.storage.getStatus(),
    });
}

export function useSetupStorage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => api.storage.setup(),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.storageStatus }),
    });
}

export function useTeardownStorage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => api.storage.teardown(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.storageStatus });
            queryClient.invalidateQueries({ queryKey: queryKeys.storedMatches });
        },
    });
}

// ---- Stored matches ----

export function useStoredMatches() {
    return useQuery({
        queryKey: queryKeys.storedMatches,
        queryFn: () => api.storage.listMatches(),
    });
}

export function useDeleteMatch() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (matchId: string) => api.storage.deleteMatch(matchId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.storedMatches });
            queryClient.invalidateQueries({ queryKey: queryKeys.storageStatus });
        },
    });
}

export function useUploadReplay() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ file, override }: { file: File; override: boolean }) =>
            api.storage.uploadReplay(file, override),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.storedMatches });
            queryClient.invalidateQueries({ queryKey: queryKeys.storageStatus });
        },
    });
}

// ---- Recent matches ----

export const RECENT_MATCHES_PAGE_SIZE = 10;

export function useRecentMatches(offset: number) {
    return useQuery({
        queryKey: queryKeys.recentMatches(offset, RECENT_MATCHES_PAGE_SIZE),
        queryFn: () => api.remote.getRecentMatches(offset, RECENT_MATCHES_PAGE_SIZE),
    });
}

export function useShippingVersion() {
    const existing = useAppStore((s) => s.currentValorantShippingVersion);
    const setShippingVersion = useAppStore((s) => s.setCurrentShippingVersion);

    useQuery({
        queryKey: queryKeys.currentShippingVersion,
        queryFn: async () => {
            const versionInfo = await api.valorantVersionInfo.get();
            setShippingVersion(versionInfo.version);
            return versionInfo;
        },
        enabled: !existing,
        refetchInterval: 5_000,
        staleTime: 0,
    });

    return existing;
}

// ---- Download states ----

/**
 * Returns the current `DownloadStateDTO` for a single match from the Zustand store.
 *
 * On first call, if the store hasn't been hydrated yet (no WS StateUpdated snapshot
 * has arrived), fires a one-shot REST fetch to seed the full map. Subsequent calls
 * from any component share the same React Query cache entry and will not re-fetch.
 *
 * After hydration, all updates arrive exclusively via WebSocket events:
 *   - `StateUpdated`    → full snapshot (on WS reconnect)
 *   - `KeyValueUpdated` → single-match delta
 *
 * Returns `undefined` while the store is still being hydrated.
 */
export function useDownloadState(matchId: string): DownloadStateDTO | undefined {
    const downloadStates = useAppStore((s) => s.downloadStates);
    const setDownloadStates = useAppStore((s) => s.setDownloadStates);

    useQuery({
        queryKey: queryKeys.downloadStates,
        queryFn: async () => {
            const states = await api.storage.getAllDownloadStates();
            setDownloadStates(states);
            return states;
        },
        // Skip if already populated — either by a prior REST fetch or a WS snapshot
        // that arrived before this hook first mounted.
        enabled: downloadStates === null,
        staleTime: Infinity,
        retry: false,
    });

    return downloadStates?.[matchId];
}

/**
 * Convenience boolean selectors derived from `useDownloadState`.
 * Use these in components to branch on the current state without
 * manually comparing `DownloadState` enum values.
 */
export function useDownloadStateFlags(matchId: string) {
    const dto = useDownloadState(matchId);

    return {
        /** No entry exists or the last attempt failed — a download can be started. */
        canDownload:   dto === undefined || dto.state === DownloadState.FAILED,
        /** A download is currently in progress. */
        isDownloading: dto?.state === DownloadState.DOWNLOADING,
        /** The download failed and can be retried. */
        isFailed:      dto?.state === DownloadState.FAILED,
        /** The replay is locally stored and ready to use. */
        isDownloaded:  dto?.state === DownloadState.DOWNLOADED,
        /** The raw DTO — useful when you need the state value itself. */
        dto,
    } as const;
}

/**
 * Triggers a download for a match.
 * The store is updated exclusively via the WebSocket `KeyValueUpdated` event
 * that the backend emits when the state transitions to `DOWNLOADING`.
 */
export function useTriggerDownload() {
    return useMutation({
        mutationFn: (matchId: string) => api.remote.triggerDownload(matchId),
    });
}

/**
 * Retries a failed download. Identical shape to `useTriggerDownload` —
 * kept separate so call sites can distinguish intent.
 */
export function useRetryDownload() {
    return useMutation({
        mutationFn: (matchId: string) => api.remote.retryDownload(matchId),
    });
}

// ---- Match stats ----

/**
 * Returns match stats for a single match, lazily fetched from the REST endpoint.
 *
 * Priority:
 *  1. If the Zustand store already has data (pushed via WS), return that immediately.
 *  2. Otherwise fire a REST call, write the result into the store, and return it.
 *
 * Pass `enabled = false` to defer fetching (e.g. for collapsed rows).
 * Returns `null` if the backend reports no stats yet (HTTP 404).
 */
export function useMatchStats(matchId: string, enabled = true) {
    const wsData = useAppStore((s) => s.matchStatsCache?.[matchId]);
    const setMatchStat = useAppStore((s) => s.setMatchStat);

    const query = useQuery<MatchStatsResult | null>({
        queryKey: queryKeys.matchStats(matchId),
        queryFn: async () => {
            try {
                const result = await api.matchStats.getById(matchId);
                setMatchStat(matchId, result);
                return result;
            } catch (e) {
                if (e instanceof Error && e.message.startsWith('HTTP 404')) {
                    return null;
                }
                throw e;
            }
        },
        // Skip REST call when WS already delivered data.
        enabled: enabled && wsData === undefined,
        staleTime: Infinity,
        retry: false,
    });

    // WS data always wins — short-circuit React Query entirely.
    if (wsData !== undefined) {
        return { data: wsData, isLoading: false, isError: false, isFetching: false } as const;
    }
    return query;
}

export function useTriggerMatchStatsFetch() {
    const setMatchStat = useAppStore((s) => s.setMatchStat);
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (matchId: string) => api.matchStats.triggerFetch(matchId),
        onMutate: (matchId) => {
            // Optimistically mark as pending so the panel shows a spinner immediately.
            setMatchStat(matchId, { type: 'PENDING' } as unknown as MatchStatsResult);
            queryClient.removeQueries({ queryKey: queryKeys.matchStats(matchId) });
        },
    });
}

// ---- Map registry ----

/**
 * Fetches the full map asset registry from the backend and stores it in the Zustand app state.
 * Re-polls every 3s if the backend hasn't finished loading the data yet (HTTP 404).
 * Once loaded, the registry is stable and never re-fetched.
 */
export function useMapRegistry() {
    const setMapRegistry = useAppStore((s) => s.setMapRegistry);
    const existing = useAppStore((s) => s.mapRegistry);

    useQuery<Record<string, MapAsset> | null>({
        queryKey: queryKeys.mapRegistry,
        queryFn: async () => {
            try {
                const raw = await api.assets.getAllMaps();
                setMapRegistry(raw);
                return raw;
            } catch (e) {
                if (e instanceof Error && e.message.startsWith('HTTP 404')) {
                    return null;
                }
                throw e;
            }
        },
        enabled: existing === null,
        refetchInterval: (query) => query.state.data === null ? 3000 : false,
        staleTime: Infinity,
        retry: false,
    });

    return existing;
}

export function useProductSessionRegistry() {
    const sessionRegistry = useAppStore((s) => s.sessionRegistry);
    const setSessionRegistry = useAppStore((s) => s.setSessionRegistry);

    useQuery({
        queryKey: queryKeys.productSessionRegistry,
        queryFn: async () => {
            const data = await api.sessions.getAllProductSessions();
            setSessionRegistry(data);
            return data;
        },
        enabled: sessionRegistry === null,
        staleTime: Infinity,
        retry: false,
    });

    return sessionRegistry;
}

export function useProductSession(productId: string): ProductSession | null {
    const registry = useProductSessionRegistry();
    if (!registry) return null;
    return Object.values(registry).find((s) => s.productId === productId) ?? null;
}

// ---- Injector ----

export function useInjectStatus() {
    return useQuery({
        queryKey: queryKeys.injectStatus,
        queryFn: () => api.injector.getStatus(),
        refetchInterval: (query) => {
            const state = query.state.data?.state;
            const terminal = !state || state === 'IDLE' || state === 'INJECTED' || state === 'FAILED';
            return terminal ? false : 3000;
        },
        staleTime: 0,
    });
}

export function useStartInject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (matchId: string) => api.injector.startInject(matchId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.injectStatus }),
    });
}

export function useCancelInject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => api.injector.cancelInject(),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.injectStatus }),
    });
}

// ---- Configuration ----

export function useEffectiveConfig() {
    return useQuery({
        queryKey: queryKeys.effectiveConfig,
        queryFn: () => api.config.getCurrent(),
        staleTime: 30_000,
    });
}

export function useConfigOverrides() {
    return useQuery({
        queryKey: queryKeys.configOverrides,
        queryFn: async () => {
            try {
                return await api.config.getOverrides();
            } catch (e) {
                if (e instanceof Error && e.message.startsWith('HTTP 404')) {
                    return null;
                }
                throw e;
            }
        },
        staleTime: 30_000,
    });
}

export function useSaveConfigOverrides() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (overrides: ConfigOverrides) => api.config.saveOverrides(overrides),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.configOverrides });
            queryClient.invalidateQueries({ queryKey: queryKeys.effectiveConfig });
        },
    });
}

export function useDeleteConfigOverrides() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => api.config.deleteOverrides(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.configOverrides });
            queryClient.invalidateQueries({ queryKey: queryKeys.effectiveConfig });
        },
    });
}