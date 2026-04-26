import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ConfigOverrides, MapAsset, MatchStatsResult } from '@/lib/api';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import type { ProductSession } from '#/dto/ProductSession.ts';

// ---- Query keys ----

export const queryKeys = {
    isConnected: ['isConnected'] as const,
    storageStatus: ['storageStatus'] as const,
    storedMatches: ['storedMatches'] as const,
    currentShippingVersion: ['currentShippingVersion'] as const,
    recentMatches: (offset: number, limit: number) => ['recentMatches', offset, limit] as const,
    downloadState: (matchId: string) => ['downloadState', matchId] as const,
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
        // Fast-poll when disconnected, stop when connected
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

/**
 * Download state for a single match.
 * Only fetches when the matchId has been marked as triggered (via useTriggerDownload).
 * Polls every 3s while PENDING, stops on SUCCESS or FAILURE.
 */
export function useDownloadState(matchId: string) {
    const isTriggered = useAppStore((s) => s.triggeredMatchIds.includes(matchId));

    return useQuery({
        queryKey: queryKeys.downloadState(matchId),
        queryFn: () => api.remote.getDownloadState(matchId),
        enabled: isTriggered,
        refetchInterval: (query) =>
            query.state.data?.type === 'PENDING' ? 3000 : false,
        staleTime: 0,
    });
}

export function useTriggerDownload() {
    const queryClient = useQueryClient();
    const addTriggeredMatch = useAppStore((s) => s.addTriggeredMatch);

    return useMutation({
        mutationFn: (matchId: string) => api.remote.triggerDownload(matchId),
        onMutate: (matchId) => {
            addTriggeredMatch(matchId);
            // Optimistically set PENDING so polling starts immediately
            queryClient.setQueryData(queryKeys.downloadState(matchId), { type: 'PENDING' });
        },
        onError: (e: Error, matchId) => {
            queryClient.setQueryData(queryKeys.downloadState(matchId), {
                type: 'FAILURE',
                error: { message: e.message },
            });
        },
    });
}

export function useRetryDownload() {
    const queryClient = useQueryClient();
    const addTriggeredMatch = useAppStore((s) => s.addTriggeredMatch);

    return useMutation({
        mutationFn: (matchId: string) => api.remote.retryDownload(matchId),
        onMutate: (matchId) => {
            addTriggeredMatch(matchId);
            queryClient.setQueryData(queryKeys.downloadState(matchId), { type: 'PENDING' });
        },
        onError: (e: Error, matchId) => {
            queryClient.setQueryData(queryKeys.downloadState(matchId), {
                type: 'FAILURE',
                error: { message: e.message },
            });
        },
    });
}

// ---- Match stats ----

/**
 * Fetches cached match stats from the backend.
 * - Returns `null` if the stats haven't been fetched yet (404).
 * - WS-pushed data from ValorantMatchStatsManager takes priority over the REST result.
 * - Only fetches when `enabled` is true (lazy – open collapsible to trigger).
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
        // Skip the REST call if WS already delivered data
        enabled: enabled && wsData === undefined,
        staleTime: Infinity,
        retry: false,
    });

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
            // Optimistically mark as pending so the panel shows a spinner immediately
            setMatchStat(matchId, { type: 'PENDING' });
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
        // Skip the fetch entirely if the registry is already populated in the store
        enabled: existing === null,
        // Poll every 3s while the backend hasn't produced data yet
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
        // Poll every 3s while an injection is actively in progress
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
