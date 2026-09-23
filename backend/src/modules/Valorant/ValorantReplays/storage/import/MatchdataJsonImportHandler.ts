import { Logger } from '@nestjs/common';
import { ImportData, ImportHandler } from '@/modules/Valorant/ValorantReplays/storage/import/ImportHandler';
import { ReplayFileTypeSchema, ReplayImportRequest } from '#/schemas/upload/ImportReplay.schema';
import { RiotMatchApiResponseDTOSchema } from '#/schemas/RiotMatchApiReponseDTO';
import { CURRENT_REPLAY_FORMAT_VERSION, ReplayMetadataV2 } from '#/schemas/ReplayFormatV2.schema';
import { InvalidReplayArchiveError } from '@/modules/Valorant/ValorantReplays/storage/ReplayStorageErrors';
import { PuuidToPlayerAliasManager } from '@/modules/PuuidToPlayerAliasModule/PuuidToPlayerAliasManager';
import { PlayerAliasDTO } from '#/schemas/PlayerAlias.schema';
import { GUID } from '#/schemas/GUIDSchema';

const PUUID_RESOLVE_TIMEOUT_MS = 5_000;

export class MatchdataJsonImportHandler implements ImportHandler {
    private readonly logger = new Logger(this.constructor.name);

    constructor(private readonly puuidManager: PuuidToPlayerAliasManager) {
    }

    async import(file: Buffer, request: ReplayImportRequest): Promise<ImportData> {
        if (request.type !== ReplayFileTypeSchema.enum.riotMetadata) {
            throw new Error(`MatchdataJsonImportHandler received unexpected import type: ${request.type}`);
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(file.toString('utf-8'));
        } catch {
            throw new InvalidReplayArchiveError('Failed to parse uploaded file as JSON');
        }

        const matchDetailsResult = RiotMatchApiResponseDTOSchema.safeParse(parsed);
        if (!matchDetailsResult.success) {
            throw new InvalidReplayArchiveError('Uploaded file is not a valid Riot match API response');
        }
        const matchDetails = matchDetailsResult.data;

        const puuidResolver = await this.resolvePuuids(matchDetails.players.map((p) => p.subject));

        const matchUuid = matchDetails.matchInfo.matchId;
        const concatId = matchUuid.substring(0, 8);

        const metadata: ReplayMetadataV2 = {
            formatVersion: CURRENT_REPLAY_FORMAT_VERSION,
            uuid: matchUuid,
            riotMatchMetadata: {
                matchMetadata: matchDetails,
                puuidResolver,
            },
            replayFileMetadata: null,
            downloaderMetadata: null,
            userMetadata: request.userMetadata ?? {
                name: `Replay ${concatId}`,
                tags: [],
                notes: null,
            },
        };

        return { metadata };
    }

    private async resolvePuuids(puuids: string[]): Promise<Record<GUID, PlayerAliasDTO>> {
        const resolver: Record<GUID, PlayerAliasDTO> = {};
        if (puuids.length === 0) return resolver;

        try {
            this.puuidManager.requestBatchFetch(puuids);
            const resolved = await this.puuidManager.getBestEffortBatchedResult(puuids, PUUID_RESOLVE_TIMEOUT_MS);
            for (const puuid of puuids) {
                const alias = resolved[puuid];
                if (alias) resolver[puuid] = alias;
            }
        } catch (error) {
            this.logger.warn('Failed to resolve player aliases while importing Riot match metadata', error);
        }

        return resolver;
    }
}
