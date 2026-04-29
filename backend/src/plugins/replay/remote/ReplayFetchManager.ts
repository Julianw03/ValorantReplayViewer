import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import {
    PlayerSummary,
    REPLAY_FORMAT_VERSION,
    ReplayMetadata,
    TeamSummary,
} from '@/plugins/replay/storage/ReplayStorageFormat';
import { RiotMatchApiResponse } from '@/caching/ValorantMatchStatsModule/RiotMatchApiResponseDTO';
import { MatchHistoryEntry, RiotValorantAPI } from '@/api/riot/RiotValorantAPI';
import { ValorantMatchStatsManager } from '@/caching/ValorantMatchStatsModule/ValorantMatchStatsManager';
import { EntitlementTokenManager } from '@/caching/EntitlementTokenModule/EntitlementTokenManager';
import { PuuidToPlayerAliasManager } from '@/caching/PuuidToPlayerAliasManager/PuuidToPlayerAliasManager';

export interface CombinedReplayData {
    metadata: ReplayMetadata;
    replayBuffer: Buffer;
    matchDetails: RiotMatchApiResponse;
}

@Injectable()
export class ReplayFetchManager {
    private readonly logger = new Logger(ReplayFetchManager.name);

    constructor(
        private readonly apiClient: RiotValorantAPI,
        private readonly tokenManager: EntitlementTokenManager,
        private readonly valorantMatchStatsManager: ValorantMatchStatsManager,
        private readonly puuidManager: PuuidToPlayerAliasManager,
    ) {
    }

    async getRecentMatches(
        startIndex = 0,
        endIndex = 20,
    ): Promise<MatchHistoryEntry[]> {
        const entries = await this.apiClient.getMatchHistory(
            startIndex,
            endIndex,
        );
        entries.forEach((entry) => {
            this.valorantMatchStatsManager.requestMatchFetch(entry.MatchID);
        });
        return entries;
    }


    public async fetchCombinedReplayData(matchId: string): Promise<CombinedReplayData> {
        const [summary, replayBuffer, matchDetails] = await Promise.all([
            this.apiClient.getReplaySummary(matchId),
            this.apiClient.downloadReplayFile(matchId),
            this.apiClient.getMatchDetails(matchId),
        ]);


        const puuids = matchDetails.players
            .map((p) => p.subject)
            .filter((p) => p !== undefined);

        try {
            const resolvePuuidMap = await this.puuidManager.fetchPlayerAliasData(puuids);
            for (const matchDetail of matchDetails?.players ?? []) {
                const resolvedAlias = resolvePuuidMap[matchDetail.subject ?? ''];
                if (resolvedAlias) {
                    matchDetail.gameName = resolvedAlias.gameName;
                    matchDetail.tagLine = resolvedAlias.tagLine;
                }
            }
        } catch (error) {
            this.logger.warn(
                'Failed to resolve player aliases for replay metadata. Proceeding with unresolved puuids.',
                error,
            );
        }

        const tokens = this.tokenManager.getView();

        if (!tokens) {
            throw new InternalServerErrorException(
                'Current user\'s account name and tag line not found',
            );
        }

        const metadata = buildMetadata(
            matchId,
            summary.GameVersion,
            replayBuffer.byteLength,
            matchDetails,
            tokens.subject,
        );
        return {
            metadata,
            replayBuffer,
            matchDetails,
        };
    }
}

function buildMetadata(
    matchId: string,
    gameVersion: string,
    replayFileSize: number,
    matchDetails: RiotMatchApiResponse,
    subject: string,
): ReplayMetadata {
    const { matchInfo, players, teams } = matchDetails;

    const teamSummaries: TeamSummary[] = (teams ?? []).map((t) => ({
        teamId: t.teamId,
        won: t.won,
        roundsWon: t.roundsWon,
        roundsPlayed: t.roundsPlayed,
    }));

    const playerSummaries: PlayerSummary[] = players.map((p) => ({
        puuid: p.subject ?? '',
        gameName: p.gameName ?? '',
        tagLine: p.tagLine ?? '',
        teamId: p.teamId ?? '',
        characterId: p.characterId ?? '',
        kills: p.stats?.kills ?? 0,
        deaths: p.stats?.deaths ?? 0,
        assists: p.stats?.assists ?? 0,
        isObserver: p.isObserver ?? false,
    }));

    return {
        formatVersion: REPLAY_FORMAT_VERSION,
        matchInfo: {
            matchId,
            mapId: matchInfo.mapId,
            queueID: matchInfo.queueID,
            gameStartMillis: matchInfo.gameStartMillis,
            gameLengthMillis: matchInfo.gameLengthMillis,
            isRanked: matchInfo.isRanked,
            gameVersion,
        },
        downloadInfo: {
            downloadedAt: Date.now(),
            downloaderId: subject,
        },
        replayFileSize,
        teams: teamSummaries,
        players: playerSummaries,
    };
}
