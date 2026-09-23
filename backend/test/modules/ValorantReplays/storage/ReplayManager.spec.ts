import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '@/db/schema';
import { ReplayManager } from '@/modules/Valorant/ValorantReplays/storage/ReplayManager';
import { ReplayDBService } from '@/modules/Valorant/ValorantReplays/storage/db/ReplayDBService';
import { ReplayDBConnection } from '@/modules/Valorant/ValorantReplays/storage/db/ReplayDBConnection';
import {
    MatchAlreadyExistsError,
    MatchNotFoundError,
    ReplayFileMissingError,
    UserMetadataVersionMismatchError,
} from '@/modules/Valorant/ValorantReplays/storage/ReplayStorageErrors';
import { CURRENT_REPLAY_FORMAT_VERSION, ReplayMetadataV2 } from '#/schemas/ReplayFormatV2.schema';
import { RiotMatchApiResponseDTOSchema } from '#/schemas/RiotMatchApiReponseDTO';
import { DownloadState } from '#/schemas/DownloadState.schema';
import { AsyncResult } from '#/utils/AsyncResult';
import exampleMatch from '../../../schemas/RiotMatchAPI/example_1.json';

const MIGRATIONS = path.resolve(__dirname, '../../../../db/migrations');
const MATCH_ID = 'b84da47a-eef3-4497-ab6d-0c7a92151519';
const DOWNLOADER_ID = '0f1e2d3c-4b5a-4968-8776-655443322110';
const UNKNOWN_ID = '11111111-2222-4333-8444-555555555555';

function downloadedMetadata(): ReplayMetadataV2 {
    return {
        formatVersion: CURRENT_REPLAY_FORMAT_VERSION,
        uuid: MATCH_ID,
        riotMatchMetadata: {
            matchMetadata: RiotMatchApiResponseDTOSchema.parse(exampleMatch),
            puuidResolver: {},
        },
        downloaderMetadata: { downloadedAt: 1_700_000_000_000, downloaderId: DOWNLOADER_ID },
        userMetadata: { name: 'My replay', tags: ['ranked', 'ace'], notes: 'clutch' },
    };
}

function unwrap<T>(result: AsyncResult<T, Error>): T {
    if (result.isSuccess()) return result.data;
    throw result.isFailure() ? result.error : new Error('Result is pending');
}

describe('ReplayManager', () => {
    let tmpRoot: string;
    let replaysDir: string;
    let demosDir: string;
    let sqlite: Database.Database;
    let fetchCombinedReplayData: ReturnType<typeof vi.fn>;
    let manager: ReplayManager;
    const replayBytes = Buffer.from('replay-file-content');

    const createManager = () => {
        const db = drizzle(sqlite, { schema });
        const dbService = new ReplayDBService({ db } as unknown as ReplayDBConnection);
        const instance = new ReplayManager(
            dbService,
            { fetchCombinedReplayData } as never,
            {} as never,
            { getPersistentPathBase: () => replaysDir } as never,
            { publish: vi.fn() } as never,
            { filepaths: { 'valorant-saved': { path: [path.join(tmpRoot, 'saved')] } } } as never,
        );
        instance.onModuleInit();
        return instance;
    };

    beforeEach(() => {
        tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vrv-replays-'));
        replaysDir = path.join(tmpRoot, 'replays');
        demosDir = path.join(tmpRoot, 'saved', 'Demos');

        sqlite = new Database(':memory:');
        sqlite.pragma('foreign_keys = ON');
        migrate(drizzle(sqlite, { schema }), { migrationsFolder: MIGRATIONS });

        fetchCombinedReplayData = vi.fn().mockResolvedValue({
            metadata: downloadedMetadata(),
            replayBuffer: replayBytes,
        });
        manager = createManager();
    });

    afterEach(() => {
        sqlite.close();
        fs.rmSync(tmpRoot, { recursive: true, force: true });
    });

    it('exposes a downloaded match as ReplayMetadataV2 backed by the stored files', async () => {
        await manager.triggerDownload(MATCH_ID);

        const replay = unwrap(await manager.getReplay(MATCH_ID));
        const expected = downloadedMetadata();
        expect(replay).toEqual({
            ...expected,
            replayFileMetadata: {
                fileSizeBytes: replayBytes.length,
                checksum: createHash('sha256').update(replayBytes).digest('hex'),
            },
        });
        expect(manager.getKeyView(MATCH_ID)).toEqual({ state: DownloadState.DOWNLOADED });
        await expect(manager.getStatus()).resolves.toMatchObject({ isSetup: true, matchCount: 1 });
    });

    it('keeps stored matches across restarts', async () => {
        await manager.triggerDownload(MATCH_ID);

        const restarted = createManager();

        expect(restarted.getKeyView(MATCH_ID)).toEqual({ state: DownloadState.DOWNLOADED });
        expect(unwrap(await restarted.getReplay(MATCH_ID)).uuid).toBe(MATCH_ID);
    });

    it('marks a failed download and stores nothing', async () => {
        fetchCombinedReplayData.mockRejectedValue(new Error('network down'));

        await expect(manager.triggerDownload(MATCH_ID)).rejects.toThrow('network down');

        expect(manager.getKeyView(MATCH_ID)).toEqual({ state: DownloadState.FAILED });
        expect(manager.matchRegistered(MATCH_ID)).toBe(false);
    });

    it('treats files missing on disk as absent instead of failing', async () => {
        await manager.triggerDownload(MATCH_ID);
        fs.rmSync(path.join(replaysDir, MATCH_ID, `${MATCH_ID}.vrf`));

        const withoutReplay = unwrap(await manager.getReplay(MATCH_ID));
        expect(withoutReplay.replayFileMetadata).toBeNull();
        expect(withoutReplay.riotMatchMetadata).toEqual(downloadedMetadata().riotMatchMetadata);
        await expect(manager.moveToValorantDemos(MATCH_ID)).rejects.toThrow(ReplayFileMissingError);

        fs.rmSync(path.join(replaysDir, MATCH_ID), { recursive: true });

        const withoutAnyFile = unwrap(await manager.getReplay(MATCH_ID));
        expect(withoutAnyFile.riotMatchMetadata).toBeNull();
        expect(withoutAnyFile.userMetadata?.name).toBe('My replay');
    });

    it('rejects importing a duplicate unless override is requested', async () => {
        await manager.triggerDownload(MATCH_ID);
        const request = {
            type: 'replayFile' as const,
            userMetadata: { name: 'Imported', tags: [], notes: null },
        };
        const vrf = Buffer.alloc(0x30 + 72);
        vrf.write(MATCH_ID, 0x30, 'utf16le');

        const duplicate = await manager.importReplay(vrf, request, false);
        expect(duplicate.isFailure() && duplicate.error).toBeInstanceOf(MatchAlreadyExistsError);

        const overridden = unwrap(await manager.importReplay(vrf, request, true));
        expect(overridden.userMetadata?.name).toBe('Imported');
        expect(overridden.riotMatchMetadata).toBeNull();
        expect(overridden.replayFileMetadata?.fileSizeBytes).toBe(vrf.length);
    });

    it('exports a package that imports back into the same metadata', async () => {
        await manager.triggerDownload(MATCH_ID);
        const original = unwrap(await manager.getReplay(MATCH_ID));
        const zip = unwrap(await manager.exportMatchToZip(MATCH_ID));

        unwrap(await manager.deleteMatch(MATCH_ID));
        const imported = unwrap(await manager.importReplay(zip, { type: 'package' }, false));

        expect(imported).toEqual(original);
    });

    it('deletes a single match with its files', async () => {
        await manager.triggerDownload(MATCH_ID);

        unwrap(await manager.deleteMatch(MATCH_ID));

        expect(fs.existsSync(path.join(replaysDir, MATCH_ID))).toBe(false);
        const lookup = await manager.getReplay(MATCH_ID);
        expect(lookup.isFailure() && lookup.error).toBeInstanceOf(MatchNotFoundError);
        const unknown = await manager.deleteMatch(UNKNOWN_ID);
        expect(unknown.isFailure() && unknown.error).toBeInstanceOf(MatchNotFoundError);
    });

    it('teardown removes the replay folder and all database entries', async () => {
        await manager.triggerDownload(MATCH_ID);

        await manager.teardown();

        expect(fs.existsSync(replaysDir)).toBe(false);
        await expect(manager.getStatus()).resolves.toEqual({ isSetup: false, matchCount: 0, totalSizeBytes: 0 });
        expect(manager.matchRegistered(MATCH_ID)).toBe(false);
        expect(manager.getKeyView(MATCH_ID)).toBeNull();
    });

    it('copies the stored replay into the VALORANT Demos folder for injection', async () => {
        await manager.triggerDownload(MATCH_ID);

        await manager.injectReplayOverPlaceholder(MATCH_ID, UNKNOWN_ID);

        expect(fs.readFileSync(path.join(demosDir, `${UNKNOWN_ID}.vrf`))).toEqual(replayBytes);
    });

    describe('user metadata', () => {
        beforeEach(async () => {
            await manager.triggerDownload(MATCH_ID);
        });

        it('applies a patch against the current version and registers new tags', async () => {
            const initial = unwrap(manager.getUserMetadata(MATCH_ID));

            const updated = unwrap(manager.updateUserMetadata(MATCH_ID, initial.version, {
                name: 'Renamed',
                tags: ['ranked', 'brand-new'],
            }));

            expect(updated.version).not.toBe(initial.version);
            expect(updated.userMetadata).toEqual({ name: 'Renamed', notes: 'clutch', tags: ['ranked', 'brand-new'] });
            expect(unwrap(await manager.getReplay(MATCH_ID)).userMetadata).toEqual(updated.userMetadata);
        });

        it('rejects a patch based on a stale version and keeps the data', async () => {
            const initial = unwrap(manager.getUserMetadata(MATCH_ID));
            unwrap(manager.updateUserMetadata(MATCH_ID, initial.version, { notes: 'first writer' }));

            const stale = manager.updateUserMetadata(MATCH_ID, initial.version, { notes: 'second writer' });

            expect(stale.isFailure() && stale.error).toBeInstanceOf(UserMetadataVersionMismatchError);
            expect(unwrap(manager.getUserMetadata(MATCH_ID)).userMetadata.notes).toBe('first writer');
        });

        it('leaves fields absent from the patch untouched', () => {
            const initial = unwrap(manager.getUserMetadata(MATCH_ID));

            const updated = unwrap(manager.updateUserMetadata(MATCH_ID, initial.version, { notes: null }));

            expect(updated.userMetadata).toEqual({ ...initial.userMetadata, notes: null });
        });

        it('reports unknown matches', () => {
            const read = manager.getUserMetadata(UNKNOWN_ID);
            const write = manager.updateUserMetadata(UNKNOWN_ID, 1, { name: 'x' });

            expect(read.isFailure() && read.error).toBeInstanceOf(MatchNotFoundError);
            expect(write.isFailure() && write.error).toBeInstanceOf(MatchNotFoundError);
        });
    });
});
