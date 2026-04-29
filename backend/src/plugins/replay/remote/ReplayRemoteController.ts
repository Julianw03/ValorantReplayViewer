import { ReplayFetchManager } from '@/plugins/replay/remote/ReplayFetchManager';
import {
    BadRequestException,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Logger,
    Param,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiAcceptedResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ReplayIOManagerV2 } from '@/plugins/replay/storage/ReplayIOManagerV2';
import { GetRecentMatchesDto } from '@/plugins/replay/remote/GetRecentMatchesDTO';
import { MatchHistoryEntry } from '@/api/riot/RiotValorantAPI';
import { ProductSessionGuard, RequiredProduct } from '@/caching/ProductSessionManager/ProductSessionGuard';
import { DownloadStateDTO } from '#/dto/DownloadStateDTO';

@RequiredProduct('valorant')
@UseGuards(ProductSessionGuard)
@Controller({
    path: 'plugins/replay/remote',
})
export class ReplayRemoteController {
    private readonly logger = new Logger(ReplayRemoteController.name);

    constructor(
        protected readonly replayIOManager: ReplayIOManagerV2,
        protected readonly replayFetchManager: ReplayFetchManager,
    ) {
    }

    @Get('matches/recent')
    @ApiOperation({
        summary: 'Get recent matches',
        description: 'Fetches recent matches from the Riot API.',
    })
    @ApiOkResponse({
        description: 'List of recent matches.',
    })
    async getRecentMatches(
        @Query() query: GetRecentMatchesDto,
    ): Promise<MatchHistoryEntry[]> {
        this.logger.debug(
            `Fetching recent matches with offset ${query.offset} and limit ${query.limit}`,
        );
        const startIndex = query.offset;
        const endIndex = query.offset + query.limit;
        return this.replayFetchManager.getRecentMatches(startIndex, endIndex);
    }

    @Post('matches/recent/:matchId/download')
    @ApiOperation({
        summary: 'Trigger replay download',
        description: 'Starts downloading replay data for a given match.',
    })
    @HttpCode(HttpStatus.ACCEPTED)
    @ApiAcceptedResponse({
        description: 'Download triggered.',
    })
    async triggerDownload(@Param('matchId') matchId: string): Promise<void> {
        this.replayIOManager.triggerDownload(matchId);
    }

    @Post('matches/recent/:matchId/download/retry')
    @ApiOperation({
        summary: 'Retry replay download',
        description: 'Retries a failed replay download for a given match.',
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async retryDownload(@Param('matchId') matchId: string): Promise<void> {
        this.replayIOManager.triggerDownload(matchId, true);
    }

    @Get('matches/recent/:matchId/download/state')
    @ApiOperation({
        summary: 'Get download state',
        description: 'Returns current status of a replay download job.',
    })
    async getDownloadState(
        @Param('matchId') matchId: string,
    ): Promise<DownloadStateDTO | null> {
        const entryView = this.replayIOManager.getEntryView(matchId);
        if (entryView === null) {
            throw new BadRequestException(`No download job found for match ${matchId}`);
        }
        return entryView;
    }
}
