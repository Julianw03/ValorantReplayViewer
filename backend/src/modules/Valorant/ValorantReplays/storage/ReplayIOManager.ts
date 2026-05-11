import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ReplayMetadata } from '@/modules/Valorant/ValorantReplays/storage/ReplayStorageFormat';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { StorageStatusDTO } from '@/modules/Valorant/ValorantReplays/storage/StorageStatusDTO';
import AdmZip from 'adm-zip';
import { ReplayFetchManager } from '@/modules/Valorant/ValorantReplays/remote/ReplayFetchManager';
import { AsyncResult } from '#/utils/AsyncResult';
import { appConfig } from '@/config/configLoader';
import { type ConfigType } from '@nestjs/config';
import { DownloadState, DownloadStateDTO } from '#/dto/DownloadStateDTO';
import { SimpleEventBus } from '@/core/events/SimpleEventBus';
import { plainToInstance } from 'class-transformer';
import { isPathWithin } from '@/utils/PathUtils';
import { IMapDataManager } from '@/core/data/interfaces/IMapDataManager';
import { SimpleMapDataManager } from '@/core/data/SimpleMapDataManager';
import { RecomputingMapMappingBehavior } from '@/core/data/behaviors/viewMapping/RecomputingMapMappingBehavior';
import { EmittingMapDataBehavior } from '@/core/data/behaviors/emission/EmittingMapDataBehavior';
import { KeyDataViewable } from '@/core/data/interfaces/capabilities/KeyDataViewable';


type ImportMatchError =
    | MatchAlreadyExistsError
    | IllegalDownloadStateError
    | InvalidReplayArchiveError;

type LoadSavedMetadataError =
    | MatchNotFoundError
    | IllegalDownloadStateError

type DeleteMatchError = MatchNotFoundError;

export class MatchNotFoundError extends Error {
    constructor(matchId: string) {
        super(`Match ${matchId} not found in storage`);
    }
}

export class MatchAlreadyExistsError extends Error {
    constructor(matchId: string) {
        super(`Match ${matchId} already exists in storage`);
    }
}

export class IllegalDownloadStateError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class InvalidReplayArchiveError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class StorageNotSetupError extends Error {
    constructor() {
        super('Storage is not set up');
    }
}

export class UnableToDeleteMatchError extends Error {
    constructor(matchId: string, originalError: Error) {
        super(`Failed to delete match ${matchId}: ${originalError.message}`);
        this.stack = originalError.stack;
    }
}

const expect = (
    expected: DownloadState,
    actual: DownloadState | null,
): AsyncResult<DownloadState, IllegalDownloadStateError> => {
    if (actual === expected) {
        return AsyncResult.success(actual);
    }

    return AsyncResult.failure(
        new IllegalDownloadStateError(
            `Expected ${expected}, got ${actual}`,
        ),
    );
};

@Injectable()
export class ReplayIOManager implements KeyDataViewable<string, DownloadStateDTO>, OnModuleInit {

    private static NON_SETUP_STATUS: StorageStatusDTO = { isSetup: false, matchCount: 0, totalSizeBytes: 0 };

    protected readonly storageBasePath: string;
    protected readonly manager: IMapDataManager<string, DownloadState, DownloadStateDTO>;
    protected readonly logger = new Logger(this.constructor.name);
    private storageStatus: StorageStatusDTO = ReplayIOManager.NON_SETUP_STATUS;
    private demosDir: string;

    constructor(
        protected readonly fetchManager: ReplayFetchManager,
        protected readonly eventBus: SimpleEventBus,
        @Inject(appConfig.KEY)
        config: ConfigType<typeof appConfig>,
    ) {
        const base = new SimpleMapDataManager<string, DownloadState>();
        const map = new RecomputingMapMappingBehavior(base, ReplayIOManager.map);
        this.manager = new EmittingMapDataBehavior(map, eventBus, this.constructor.name);
        const localAppData =
            process.env.LOCALAPPDATA ??
            path.join(os.homedir(), 'AppData', 'Local');
        this.storageBasePath = path.join(localAppData, 'ValorantReplayViewer', 'replays');
        this.demosDir = path.join(
            config.filepaths['valorant-saved'].getResolvedPath(),
            'Demos',
        );
    }

    getKeyView(key: string): DownloadStateDTO | null {
        return this.manager.getKeyView(key);
    }

    getView(): Record<string, DownloadStateDTO> | null {
        return this.manager.getView();
    }

    private matchDirSafe(matchId: string): string {
        const assumedPath = path.normalize(path.join(this.storageBasePath, matchId));
        if (!isPathWithin(this.storageBasePath, assumedPath)) {
            throw new Error('Invalid matchId, potential path traversal detected');
        }
        return assumedPath;
    }

    private replayFilePath(matchId: string): string {
        const dirPath = this.matchDirSafe(matchId);
        const assumedPath = path.normalize(path.join(dirPath, `${matchId}.vrf`));
        if (!isPathWithin(dirPath, assumedPath)) {
            throw new Error('Invalid matchId, potential path traversal detected');
        }
        return assumedPath;
    }

    private metadataFilePath(matchId: string): string {
        return path.join(this.matchDirSafe(matchId), 'metadata.json');
    }

    protected static map(value: DownloadState): DownloadStateDTO {
        return {
            state: value,
        };
    }

    async onModuleInit() {
        const isSetup = await this.isSetup();
        if (!isSetup) return;
        this.handleInitialLoad().catch();
        this.updateStorageStatus();
    }

    public getStatus(): StorageStatusDTO {
        return this.storageStatus;
    }

    private async listStoredMatchIds(): Promise<string[]> {
        try {
            const exists = await this.isSetup();
            if (!exists) return [];
            const entries = await fs.readdir(this.storageBasePath, {
                withFileTypes: true,
            });
            return entries.filter((e) => e.isDirectory()).map((e) => e.name);
        } catch {
            return [];
        }
    }

    async getStoredMatchesMetadata(): Promise<ReplayMetadata[]> {
        const matchIds = await this.listStoredMatchIds();
        const metadataList: ReplayMetadata[] = [];
        for (const matchId of matchIds) {
            try {
                const metadata = await this.loadSavedMetadataIO(matchId);
                metadataList.push(metadata);
            } catch (err) {
                this.logger.error(`Failed to load metadata for match ${matchId}`, err);
            }
        }
        return metadataList;
    }

    // TODO: This might become an issue if the number of matches grows large.
    // Instead of calculating the total size on every call, we could maintain a running total that gets updated on match add/delete.
    async updateStorageStatus(): Promise<void> {
        try {
            const matchIds = await this.listStoredMatchIds();

            const results = await Promise.allSettled(
                matchIds.map(async (matchId) => {
                    const matchPath = this.matchDirSafe(matchId);
                    const files = await fs.readdir(matchPath);

                    const sizes = await Promise.allSettled(
                        files.map(async (file) => {
                            const stats = await fs.stat(path.join(matchPath, file));
                            return stats.size;
                        }),
                    );

                    return sizes
                        .filter(r => r.status === 'fulfilled')
                        .reduce((sum, r: PromiseFulfilledResult<number>) => sum + r.value, 0);
                }),
            );

            const totalSizeBytes = results
                .filter(r => r.status === 'fulfilled')
                .reduce((sum, r: PromiseFulfilledResult<number>) => sum + r.value, 0);

            const matchCount = results.filter(r => r.status === 'fulfilled').length;

            this.storageStatus = { isSetup: true, matchCount, totalSizeBytes };
        } catch (err) {
            this.logger.error('Failed to update storage status', err);
        }
    }

    async setup(): Promise<void> {
        await fs.mkdir(this.storageBasePath, { recursive: true });
        this.logger.log(`Storage initialised at ${this.storageBasePath}`);
        this.updateStorageStatus();
    }

    async teardown(): Promise<void> {
        await fs.rm(this.storageBasePath, { recursive: true, force: true });
        this.logger.log('Storage removed');
        this.manager.deleteState();
        this.storageStatus = ReplayIOManager.NON_SETUP_STATUS;
    }

    async isSetup(): Promise<boolean> {
        try {
            await fs.access(this.storageBasePath);
            return true;
        } catch {
            return false;
        }
    }

    async deleteMatch(matchId: string): Promise<AsyncResult<void, DeleteMatchError>> {
        try {
            const exists = await this.matchExistsIO(matchId);
            if (!exists) {
                return AsyncResult.failure(new MatchNotFoundError(matchId));
            }
            await fs.rm(this.matchDirSafe(matchId), { recursive: true, force: true });
            this.logger.log(`Deleted match ${matchId}`);
            this.manager.deleteKey(matchId);
        } catch (e) {
            this.logger.warn(`Failed to delete match ${matchId}`);
            return AsyncResult.failure(new UnableToDeleteMatchError(matchId, e));
        }
        await this.updateStorageStatus();
        return AsyncResult.success(undefined);
    }

    public matchRegistered(matchId: string) {
        return this.manager.getKeyView(matchId) !== null;
    }

    private async matchExistsIO(matchId: string): Promise<boolean> {
        try {
            await fs.access(this.metadataFilePath(matchId));
            return true;
        } catch {
            return false;
        }
    }

    private async loadSavedMetadataIO(matchId: string): Promise<ReplayMetadata> {
        const raw = await fs.readFile(
            this.metadataFilePath(matchId),
            'utf-8',
        );
        return plainToInstance(
            ReplayMetadata,
            JSON.parse(
                raw,
            ));
    }

    public async loadSavedMetadata(matchId: string): Promise<AsyncResult<ReplayMetadata, LoadSavedMetadataError>> {
        const current = this.manager.getKeyView(matchId)?.state ?? null;
        if (current === null) {
            return AsyncResult.failure(new MatchNotFoundError(matchId));
        }
        return expect(DownloadState.DOWNLOADED, current).flatMapAsync(async () => AsyncResult.fromPromise(this.loadSavedMetadataIO(matchId)));
    }

    async handleInitialLoad(): Promise<void> {
        if (!(await this.isSetup())) {
            this.logger.log('Storage not set up, skipping initial load');
            return;
        }
        const matchIds = await this.listStoredMatchIds();
        await Promise.allSettled(
            matchIds.map(async (matchId) => {
                this.manager.updateKeyValue(matchId, DownloadState.DOWNLOADING);

                try {
                    const matchExists = await this.matchExistsIO(matchId);
                    this.manager.updateKeyValue(matchId, matchExists ? DownloadState.DOWNLOADED : DownloadState.FAILED);
                } catch (err) {
                    this.logger.error(`Failed to load metadata for match ${matchId}`, err);
                    this.manager.updateKeyValue(matchId, DownloadState.FAILED);
                }
            }),
        );
    }

    async moveToValorantDemos(matchId: string): Promise<void> {
        const current = this.manager.getKeyView(matchId)?.state ?? null;
        if (current === null) {
            throw new MatchNotFoundError(matchId);
        }
        if (current !== DownloadState.DOWNLOADED) {
            throw new IllegalDownloadStateError(`Match ${matchId} is in state ${current}, cannot move to Demos folder`);
        }
        const replayPath = this.replayFilePath(matchId);
        const targetPath = path.join(this.demosDir, `${matchId}.vrf`);
        if (!isPathWithin(this.demosDir, targetPath)) {
            throw new Error('Invalid matchId, potential path traversal detected');
        }
        await fs.copyFile(replayPath, targetPath);
        this.logger.log(`Copied replay for match ${matchId} to Valorant Demos folder`);
    }

    async triggerDownload(matchId: string, forceRetryWhenFailed = false): Promise<void> {
        const current = this.manager.getKeyView(matchId)?.state ?? null;
        if (current !== null && current !== DownloadState.FAILED) {
            this.logger.log('Match already exists in memory or is being downloaded, skipping download');
            return;
        }
        if (current === DownloadState.FAILED && !forceRetryWhenFailed) {
            this.logger.log('Previous download attempt failed, skipping download');
            return;
        }
        this.manager.updateKeyValue(matchId, DownloadState.DOWNLOADING);
        try {
            const { metadata, replayBuffer, matchDetails } = await this.fetchManager.fetchCombinedReplayData(matchId);
            await this.doSaveReplay(matchId, replayBuffer, metadata);
            this.manager.updateKeyValue(matchId, DownloadState.DOWNLOADED);
        } catch (err) {
            this.logger.error(`Failed to download and save match ${matchId}`, err);
            this.manager.updateKeyValue(matchId, DownloadState.FAILED);
        }
        this.updateStorageStatus();
    }

    private async doSaveReplay(
        matchId: string,
        replayData: Buffer,
        metadata: ReplayMetadata,
    ): Promise<void> {
        await fs.mkdir(this.matchDirSafe(matchId), { recursive: true });
        await fs.writeFile(this.replayFilePath(matchId), replayData);
        await fs.writeFile(
            this.metadataFilePath(matchId),
            JSON.stringify(metadata, null, 2),
            'utf-8',
        );
        this.logger.log(
            `Saved replay for match ${matchId} (${replayData.byteLength} bytes)`,
        );
    }

    public async exportMatchToZip(matchId: string): Promise<Buffer> {
        if (!await this.matchExistsIO(matchId)) {
            throw new MatchNotFoundError(matchId);
        }
        const zip = new AdmZip();
        zip.addLocalFolder(this.matchDirSafe(matchId));
        return zip.toBuffer();
    }


    public async importMatch(
        zipBuffer: Buffer,
        overrideIfExists = true,
    ): Promise<AsyncResult<void, ImportMatchError>> {
        let zip: AdmZip;

        try {
            zip = new AdmZip(zipBuffer);
        } catch {
            return AsyncResult.failure(new InvalidReplayArchiveError('Invalid zip archive'));
        }

        const entries = zip.getEntries();

        if (entries.length === 0) {
            return AsyncResult.failure(new InvalidReplayArchiveError('No files found in archive'));
        }

        const metadataEntry = entries.find((e) =>
            e.entryName.endsWith('metadata.json'),
        );

        if (!metadataEntry) {
            return AsyncResult.failure(new InvalidReplayArchiveError('metadata.json not found in archive'));
        }

        const replayEntry = entries.find((e) => e.entryName.endsWith('.vrf'));

        if (!replayEntry) {
            return AsyncResult.failure(new InvalidReplayArchiveError('.vrf file not found in archive'));
        }

        let metadata: ReplayMetadata;

        try {
            metadata = plainToInstance(
                ReplayMetadata,
                JSON.parse(
                    metadataEntry.getData().toString('utf-8'),
                ));
        } catch {
            return AsyncResult.failure(new InvalidReplayArchiveError('Invalid metadata.json format'));
        }

        const matchId = metadata.matchInfo.matchId;

        const current = this.manager.getKeyView(matchId)?.state ?? null;
        switch (current) {
            case DownloadState.DOWNLOADED:
                if (!overrideIfExists) {
                    return AsyncResult.failure(new MatchAlreadyExistsError(matchId));
                }
            //Otherwise we can just continue, Fallthrough intended
            case null:
            case DownloadState.FAILED:
                break;
            default:
                return AsyncResult.failure(new IllegalDownloadStateError(`Match ${matchId} is currently in state ${current}, cannot import`));
        }
        this.manager.updateKeyValue(matchId, DownloadState.DOWNLOADING);

        try {
            const targetDir = this.matchDirSafe(matchId);
            await fs.mkdir(targetDir, { recursive: true });

            const resolvedTarget = path.resolve(targetDir);
            for (const entry of entries) {
                const entryPath = path.normalize(path.resolve(path.join(resolvedTarget, entry.entryName)));
                if (!isPathWithin(targetDir, entryPath)) {
                    return AsyncResult.failure(
                        new InvalidReplayArchiveError(`Archive entry escapes target directory: ${entry.entryName}`),
                    );
                }
            }

            zip.extractAllTo(targetDir, true);
            this.logger.log(`Imported match ${matchId} from archive`);
            this.manager.updateKeyValue(matchId, DownloadState.DOWNLOADED);
            return AsyncResult.success(undefined);
        } catch (err) {
            this.logger.error(`Failed to import match ${matchId} from archive`, err);
            this.manager.updateKeyValue(matchId, DownloadState.FAILED);
            throw new Error('Failed to extract replay archive, see server logs for details');
        }
    }

    async injectReplayOverPlaceholder(
        targetMatchId: string,
        placeholderMatchId: string,
    ): Promise<void> {
        const targetData = await fs.readFile(this.replayFilePath(targetMatchId));
        const overwritePath = path.join(this.demosDir, `${placeholderMatchId}.vrf`);
        if (!isPathWithin(this.demosDir, overwritePath)) {
            throw new Error('Invalid placeholderMatchId, potential path traversal detected');
        }
        await fs.writeFile(
            overwritePath,
            targetData,
        );
        this.logger.log(`Injected ${targetMatchId} over placeholder ${placeholderMatchId}`);
    }

    async restoreReplayFile(matchId: string): Promise<void> {
        const data = await fs.readFile(this.replayFilePath(matchId));
        const restorePath = path.join(this.demosDir, `${matchId}.vrf`);
        if (!isPathWithin(this.demosDir, restorePath)) {
            throw new Error('Invalid matchId, potential path traversal detected');
        }
        await fs.writeFile(
            restorePath,
            data,
        );
        this.logger.log(`Restored original replay file for ${matchId}`);
    }

    getStoreageStatus(): StorageStatusDTO {
        return this.storageStatus;
    }
}