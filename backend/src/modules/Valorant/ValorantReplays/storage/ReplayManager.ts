import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import fs from 'node:fs/promises';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { AsyncResult } from '#/utils/AsyncResult';
import { SimpleEventBus } from '@/core/events/SimpleEventBus';
import { IMapDataManager } from '@/core/data/interfaces/IMapDataManager';
import { SimpleMapDataManager } from '@/core/data/SimpleMapDataManager';
import { EmittingMapDataBehavior } from '@/core/data/behaviors/emission/EmittingMapDataBehavior';
import { OuputMappingCachingMapBehavior } from '@/core/data/behaviors/viewMapping/OuputMappingCachingMapBehavior';
import { DownloadState, DownloadStateDTO } from '#/schemas/DownloadState.schema';
import { StorageStatusDTO } from '#/schemas/StorageStatusDTO';
import {
    CURRENT_REPLAY_FORMAT_VERSION,
    ReplayMetadataV2,
    RiotMatchMetadata,
    RiotMatchMetadataSchema,
    UserMetadata,
} from '#/schemas/ReplayFormatV2.schema';
import { UserMetadataPatch } from '#/schemas/replays/ReplayStorageApi.schema';
import { ReplayImportRequest } from '#/schemas/upload/ImportReplay.schema';
import { PaginationQuery, PaginationResult } from '#/schemas/Pagination.schema';
import { GUIDSchema } from '#/schemas/GUIDSchema';
import { getResolvedPath } from '@/config/ConfigV1.schema';
import { type AppConfig, InjectConfig } from '@/config/configLoader';
import { PuuidToPlayerAliasManager } from '@/modules/PuuidToPlayerAliasModule/PuuidToPlayerAliasManager';
import { PathProviderService } from '@/modules/PathProvider/PathProviderService';
import { ReplayFetchManager } from '@/modules/Valorant/ValorantReplays/remote/ReplayFetchManager';
import {
    DownloaderIdentity,
    FileRecord,
    ReplayDBService,
    StoredFileRecords,
    StoredMatchRecord,
    VersionedUserMetadata,
} from '@/modules/Valorant/ValorantReplays/storage/db/ReplayDBService';
import { forType } from '@/modules/Valorant/ValorantReplays/storage/import/HandlerFactory';
import { defaultReplayName } from '@/modules/Valorant/ValorantReplays/storage/import/ImportHandler';
import { assertValidMatchId, ReplayFileStore } from '@/modules/Valorant/ValorantReplays/storage/ReplayFileStore';
import {
    IllegalDownloadStateError,
    InvalidMatchIdError,
    InvalidReplayArchiveError,
    MatchAlreadyExistsError,
    MatchNotFoundError,
    ReplayFileMissingError,
    UserMetadataVersionMismatchError,
} from '@/modules/Valorant/ValorantReplays/storage/ReplayStorageErrors';

const RIOT_METADATA_FILE = 'riot-metadata.json';
const EXPORT_METADATA_FILE = 'metadata.json';

export interface VersionedUserMetadataView {
    userMetadata: UserMetadata;
    version: number;
}

type ImportReplayError =
    | MatchAlreadyExistsError
    | IllegalDownloadStateError
    | InvalidReplayArchiveError
    | InvalidMatchIdError;

@Injectable()
export class ReplayManager implements OnModuleInit {
    protected readonly logger = new Logger(this.constructor.name);
    protected readonly downloadStates: IMapDataManager<string, DownloadState, DownloadStateDTO>;
    private readonly files: ReplayFileStore;

    constructor(
        protected readonly db: ReplayDBService,
        protected readonly fetchManager: ReplayFetchManager,
        protected readonly puuidManager: PuuidToPlayerAliasManager,
        pathProvider: PathProviderService,
        eventBus: SimpleEventBus,
        @InjectConfig()
        private readonly config: AppConfig,
    ) {
        const replaysDir = pathProvider.getPersistentPathBase('replays');
        if (!replaysDir) {
            throw new Error('Unable to resolve replay storage directory');
        }
        this.files = new ReplayFileStore(replaysDir);

        const base = new SimpleMapDataManager<string, DownloadState>();
        const mapped = new OuputMappingCachingMapBehavior(base, (state: DownloadState): DownloadStateDTO => ({ state }));
        this.downloadStates = new EmittingMapDataBehavior(mapped, eventBus, this.constructor.name);
    }

    onModuleInit(): void {
        const stored = this.db.getAllStoredMatchIds();
        if (stored.length > 0) {
            this.downloadStates.updateKeyValueBatch(
                Object.fromEntries(stored.map(({ uuid }) => [uuid, DownloadState.DOWNLOADED])),
            );
        }
    }

    getKeyView(matchId: string): DownloadStateDTO | null {
        return this.downloadStates.getKeyView(matchId);
    }

    getView(): Record<string, DownloadStateDTO> | null {
        return this.downloadStates.getView();
    }

    async setup(): Promise<void> {
        await this.files.ensureRoot();
    }

    async teardown(): Promise<void> {
        await this.files.removeAll();
        this.db.clearAllData();
        this.downloadStates.deleteState();
    }

    async getStatus(): Promise<StorageStatusDTO> {
        return {
            isSetup: await this.files.isSetup(),
            ...this.db.getStorageTotals(),
        };
    }

    matchRegistered(matchId: string): boolean {
        return this.db.matchExists(matchId);
    }

    async triggerDownload(matchId: string, retry = false): Promise<void> {
        assertValidMatchId(matchId);
        if (this.db.matchExists(matchId)) {
            this.downloadStates.updateKeyValue(matchId, DownloadState.DOWNLOADED);
            return;
        }

        const current = this.downloadStates.getKeyView(matchId)?.state;
        if (current === DownloadState.DOWNLOADING) {
            throw new IllegalDownloadStateError(`Match ${matchId} is already downloading`);
        }
        if (current === DownloadState.FAILED && !retry) {
            throw new IllegalDownloadStateError(`Download of match ${matchId} failed, retry explicitly`);
        }

        this.downloadStates.updateKeyValue(matchId, DownloadState.DOWNLOADING);
        try {
            const { metadata, replayBuffer } = await this.fetchManager.fetchCombinedReplayData(matchId);
            await this.saveReplay(metadata, replayBuffer, false);
            this.downloadStates.updateKeyValue(matchId, DownloadState.DOWNLOADED);
        } catch (e) {
            this.logger.error(`Download of match ${matchId} failed`, e);
            this.downloadStates.updateKeyValue(matchId, DownloadState.FAILED);
            throw e;
        }
    }

    async importReplay(
        buffer: Buffer,
        request: ReplayImportRequest,
        override: boolean,
    ): Promise<AsyncResult<ReplayMetadataV2, ImportReplayError>> {
        try {
            const { metadata, replayFile } = await forType(request.type, this.puuidManager).import(buffer, request);
            if (this.downloadStates.getKeyView(metadata.uuid)?.state === DownloadState.DOWNLOADING) {
                return AsyncResult.failure(
                    new IllegalDownloadStateError(`Match ${metadata.uuid} is currently downloading`),
                );
            }

            const stored = await this.saveReplay(metadata, replayFile, override);
            this.downloadStates.updateKeyValue(metadata.uuid, DownloadState.DOWNLOADED);
            return AsyncResult.success(stored);
        } catch (e) {
            if (
                e instanceof MatchAlreadyExistsError ||
                e instanceof InvalidReplayArchiveError ||
                e instanceof InvalidMatchIdError
            ) {
                return AsyncResult.failure(e);
            }
            throw e;
        }
    }

    async getReplay(matchId: string): Promise<AsyncResult<ReplayMetadataV2, MatchNotFoundError>> {
        const record = this.db.getStoredMatchRecord(matchId);
        if (!record) {
            return AsyncResult.failure(new MatchNotFoundError(matchId));
        }
        return AsyncResult.success(await this.toMetadataV2(record));
    }

    getUserMetadata(matchId: string): AsyncResult<VersionedUserMetadataView, MatchNotFoundError> {
        const record = this.db.getUserMetadata(matchId);
        if (!record) {
            return AsyncResult.failure(new MatchNotFoundError(matchId));
        }
        return AsyncResult.success(ReplayManager.toVersionedView(record));
    }

    updateUserMetadata(
        matchId: string,
        expectedVersion: number,
        patch: UserMetadataPatch,
    ): AsyncResult<VersionedUserMetadataView, MatchNotFoundError | UserMetadataVersionMismatchError> {
        const result = this.db.updateUserMetadata(matchId, expectedVersion, patch);
        switch (result.kind) {
            case 'not_found':
                return AsyncResult.failure(new MatchNotFoundError(matchId));
            case 'version_mismatch':
                return AsyncResult.failure(new UserMetadataVersionMismatchError(matchId, result.currentVersion));
            case 'updated':
                return AsyncResult.success(ReplayManager.toVersionedView(result.record));
        }
    }

    private static toVersionedView({ version, ...userMetadata }: VersionedUserMetadata): VersionedUserMetadataView {
        return { userMetadata, version };
    }

    async listReplays({ page, pageSize }: PaginationQuery): Promise<PaginationResult<ReplayMetadataV2>> {
        const { records, total } = this.db.getStoredMatchRecords(page, pageSize);
        return {
            data: await Promise.all(records.map((record) => this.toMetadataV2(record))),
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
        };
    }

    async deleteMatch(matchId: string): Promise<AsyncResult<void, MatchNotFoundError>> {
        if (!this.db.matchExists(matchId)) {
            return AsyncResult.failure(new MatchNotFoundError(matchId));
        }
        await this.removeStoredMatch(matchId);
        return AsyncResult.success(undefined);
    }

    async exportMatchToZip(matchId: string): Promise<AsyncResult<Buffer, MatchNotFoundError>> {
        const record = this.db.getStoredMatchRecord(matchId);
        if (!record) {
            return AsyncResult.failure(new MatchNotFoundError(matchId));
        }

        const [metadata, replay] = await Promise.all([
            this.toMetadataV2(record),
            this.files.read(record.replayFile),
        ]);

        const zip = new AdmZip();
        zip.addFile(EXPORT_METADATA_FILE, Buffer.from(JSON.stringify(metadata, null, 2), 'utf-8'));
        if (replay && metadata.replayFileMetadata) {
            zip.addFile(`${matchId}.vrf`, replay);
        }
        return AsyncResult.success(zip.toBuffer());
    }

    async moveToValorantDemos(matchId: string): Promise<void> {
        await this.copyReplayToDemos(matchId, matchId);
    }

    async injectReplayOverPlaceholder(matchId: string, placeholderMatchId: string): Promise<void> {
        await this.copyReplayToDemos(matchId, placeholderMatchId);
    }

    async restoreReplayFile(placeholderMatchId: string): Promise<void> {
        await this.copyReplayToDemos(placeholderMatchId, placeholderMatchId);
    }

    private async copyReplayToDemos(sourceMatchId: string, targetMatchId: string): Promise<void> {
        assertValidMatchId(targetMatchId);
        const records = this.db.getStoredFileRecord(sourceMatchId);
        if (!records) {
            throw new MatchNotFoundError(sourceMatchId);
        }
        const source = await this.files.existingPath(records.replay);
        if (!source) {
            throw new ReplayFileMissingError(sourceMatchId);
        }

        const demosDir = path.join(getResolvedPath(this.config.filepaths['valorant-saved']), 'Demos');
        await fs.mkdir(demosDir, { recursive: true });
        await fs.copyFile(source, path.join(demosDir, `${targetMatchId}.vrf`));
    }

    private async saveReplay(
        metadata: ReplayMetadataV2,
        replayBuffer: Buffer | undefined,
        override: boolean,
    ): Promise<ReplayMetadataV2> {
        const matchId = metadata.uuid;
        if (!GUIDSchema.safeParse(matchId).success) {
            throw new InvalidMatchIdError(matchId);
        }
        if (this.db.matchExists(matchId)) {
            if (!override) {
                throw new MatchAlreadyExistsError(matchId);
            }
            await this.removeStoredMatch(matchId);
        }

        try {
            const files: StoredFileRecords = {};
            if (replayBuffer) {
                files.replay = await this.files.write(matchId, `${matchId}.vrf`, replayBuffer);
            }
            if (metadata.riotMatchMetadata) {
                files.metadata = await this.files.write(
                    matchId,
                    RIOT_METADATA_FILE,
                    Buffer.from(JSON.stringify(metadata.riotMatchMetadata), 'utf-8'),
                );
            }

            const user = metadata.userMetadata ?? { name: defaultReplayName(matchId), tags: [], notes: null };
            this.db.upsertReplayWithTags(
                matchId,
                files,
                { name: user.name, notes: user.notes ?? null },
                user.tags,
                this.toDownloaderIdentity(metadata),
            );
        } catch (e) {
            await this.files.removeMatch(matchId);
            throw e;
        }

        const record = this.db.getStoredMatchRecord(matchId)!;
        return this.toMetadataV2(record);
    }

    private async removeStoredMatch(matchId: string): Promise<void> {
        await this.files.removeMatch(matchId);
        this.db.deleteReplay(matchId);
        this.downloadStates.deleteKey(matchId);
    }

    private toDownloaderIdentity(metadata: ReplayMetadataV2): DownloaderIdentity | null {
        const downloader = metadata.downloaderMetadata;
        if (!downloader) return null;
        return {
            downloadedAtS: Math.floor(downloader.downloadedAt / 1000),
            downloaderPuuid: downloader.downloaderId,
        };
    }

    private async toMetadataV2(record: StoredMatchRecord): Promise<ReplayMetadataV2> {
        const [replayPath, riotMatchMetadata] = await Promise.all([
            this.files.existingPath(record.replayFile),
            this.readRiotMetadata(record.uuid, record.metadataFile),
        ]);

        return {
            formatVersion: CURRENT_REPLAY_FORMAT_VERSION,
            uuid: record.uuid,
            downloaderMetadata: record.downloaderPuuid && record.downloadedAtS != null
                ? { downloadedAt: record.downloadedAtS * 1000, downloaderId: record.downloaderPuuid }
                : null,
            riotMatchMetadata,
            replayFileMetadata: replayPath && record.replayFile
                ? { fileSizeBytes: record.replayFile.sizeBytes, checksum: record.replayFile.sha256 }
                : null,
            userMetadata: {
                name: record.name ?? defaultReplayName(record.uuid),
                tags: record.tags,
                notes: record.notes,
            },
        };
    }

    private async readRiotMetadata(matchId: string, file: FileRecord | null): Promise<RiotMatchMetadata | null> {
        const content = await this.files.read(file);
        if (!content) return null;
        try {
            return RiotMatchMetadataSchema.parse(JSON.parse(content.toString('utf-8')));
        } catch (e) {
            this.logger.warn(`Stored riot metadata of match ${matchId} is unreadable`, e);
            return null;
        }
    }
}
