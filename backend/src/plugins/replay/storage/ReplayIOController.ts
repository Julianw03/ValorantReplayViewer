import {
    BadRequestException,
    ConflictException,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Logger,
    NotFoundException,
    Param,
    Post,
    Query,
    Res,
    StreamableFile,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import {
    IllegalDownloadStateError,
    InvalidReplayArchiveError,
    MatchAlreadyExistsError,
    MatchNotFoundError,
    ReplayIOManagerV2,
} from '@/plugins/replay/storage/ReplayIOManagerV2';
import {
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
} from '@nestjs/swagger';
import { StorageStatusDTO } from '@/plugins/replay/storage/StorageStatusDTO';
import { ReplayMetadata } from '@/plugins/replay/storage/ReplayStorageFormat';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { DownloadStateDTO } from '#/dto/DownloadStateDTO';
import { mapErrorAsync } from '@/utils/AsyncResultSwagger';

@Controller({
    path: 'plugins/replay/storage',
    version: '1',
})
export class ReplayIOController {
    private readonly logger = new Logger(ReplayIOController.name);

    constructor(protected readonly replayIOManager: ReplayIOManagerV2) {
    }

    @Post('')
    @ApiOperation({
        summary: 'Initialize replay storage',
        description: 'Creates and prepares persistent storage for replay files.',
    })
    @ApiCreatedResponse({ description: 'Storage initialized successfully.' })
    @HttpCode(HttpStatus.CREATED)
    async setupStorage(): Promise<void> {
        await this.replayIOManager.setup();
    }

    @Delete('')
    @ApiOperation({
        summary: 'Delete replay storage',
        description: 'Removes all stored replays and deletes persistent storage.',
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Storage deleted successfully.' })
    async teardownStorage(): Promise<void> {
        await this.replayIOManager.teardown();
    }

    @Get('status')
    @ApiOperation({
        summary: 'Get storage status',
        description: 'Returns current status and health of replay storage.',
    })
    @ApiOkResponse({ description: 'Storage status retrieved.', type: StorageStatusDTO })
    async getStorageStatus(): Promise<StorageStatusDTO> {
        return this.replayIOManager.getStatus();
    }

    @Get('matches')
    @ApiOperation({
        summary: 'List stored matches',
        description: 'Returns metadata for all matches currently stored.',
    })
    @ApiOkResponse({ description: 'List of stored match metadata.' })
    async listStoredMatches(): Promise<ReplayMetadata[]> {
        return this.replayIOManager.getStoredMatchesMetadata();
    }

    @Get('download-states')
    @ApiOperation({
        summary: 'Get all download states',
        description:
            'Returns the current in-memory download state for every known match. ' +
            'Intended for initial hydration of the frontend store.',
    })
    @ApiOkResponse({ description: 'Map of matchId to DownloadState' })
    async getDownloadStates(): Promise<Record<string, DownloadStateDTO | null>> {
        const view = this.replayIOManager.getView();
        if (!view) {
            throw new NotFoundException('Replay IO Manager view not available');
        }
        return view;
    }

    @Post('matches')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: 200 * 1024 * 1024 },
        }),
    )
    async uploadReplayPortable(
        @UploadedFile() file: Express.Multer.File,
        @Query('override') override = 'true',
    ): Promise<void> {
        if (!file) throw new BadRequestException('No file uploaded');
        if (!file.originalname?.toLowerCase().endsWith('.vrp'))
            throw new BadRequestException('Invalid file type (expected .vrp)');
        if (!file.buffer || file.buffer.length === 0)
            throw new BadRequestException('Uploaded file is empty');

        return mapErrorAsync(
            this.replayIOManager.importMatch(file.buffer, override !== 'false'),
            new Map([
                [MatchAlreadyExistsError, (e) => new ConflictException(e.message)],
                [IllegalDownloadStateError, (e) => new ConflictException(e.message)],
                [InvalidReplayArchiveError, (e) => new BadRequestException(e.message)],
            ]),
        );
    }

    @Get('matches/:matchId')
    @ApiOperation({
        summary: 'Download replay file package',
        description: 'Streams the replay file package (.vrp) for the specified match.',
    })
    @ApiOkResponse({ description: 'Replay file stream.' })
    async downloadReplayPortable(
        @Param('matchId') matchId: string,
        @Res({ passthrough: true }) res: Response,
    ): Promise<StreamableFile> {
        const filePath = await this.replayIOManager.exportMatchToZip(matchId);
        res.set({
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${matchId}.vrp"`,
        });
        return new StreamableFile(filePath);
    }

    @Delete('matches/:matchId')
    @ApiOperation({
        summary: 'Delete stored match',
        description: 'Deletes replay file and metadata for a specific match.',
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Match deleted successfully.' })
    @ApiNotFoundResponse({ description: 'Match not found.' })
    async deleteStoredMatch(@Param('matchId') matchId: string): Promise<void> {
        await this.replayIOManager.deleteMatch(matchId);
    }

    @Get('storage/matches/:matchId/metadata')
    @ApiOperation({
        summary: 'Get match metadata',
        description: 'Returns detailed metadata for a specific stored match.',
    })
    @ApiOkResponse({ description: 'Match metadata retrieved.' })
    @ApiNotFoundResponse({ description: 'Match not found.' })
    async getMatchMetadata(@Param('matchId') matchId: string): Promise<ReplayMetadata> {
        return mapErrorAsync(
            this.replayIOManager.loadSavedMetadata(matchId),
            new Map([
                [MatchNotFoundError, (e) => new NotFoundException(e.message)],
                [IllegalDownloadStateError, (e) => new ConflictException(e.message)],
            ]),
        );
    }
}