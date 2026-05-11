import {
    ClassSerializerInterceptor,
    Controller,
    Get,
    NotFoundException,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { RiotClientReadyGuard } from '@/core/riotclient/RiotClientReadyGuard';
import { ApiNotFoundResponse, ApiOkResponse } from '@nestjs/swagger';
import { ValorantGameSessionManager } from '@/modules/Valorant/ValorantGameSessionModule/ValorantGameSessionManager';
import { MatchStatusDTO } from '@/modules/Valorant/ValorantGameSessionModule/MatchStatusDTO';
import type { SimpleUUID } from '@/modules/Valorant/ValorantMatchStatsModule/RiotMatchApiResponseDTO';
import { ProductSessionGuard, RequiredProduct } from '@/modules/ProductSessionManager/ProductSessionGuard';

@RequiredProduct('valorant')
@UseGuards(RiotClientReadyGuard, ProductSessionGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller({
    path: 'caching/valorant-game-sessions',
    version: '1',
})
export class ValorantGameSessionController {
    constructor(
        protected readonly valorantGameSessionManager: ValorantGameSessionManager,
    ) {}

    @Get('/match-states')
    @ApiOkResponse({
        description:
            'Returns a map of match IDs to their current match status for all matches that are currently registered',
        type: Map<SimpleUUID, MatchStatusDTO>,
    })
    @ApiNotFoundResponse({
        description: 'Returned when there is no match in progress registered.',
    })
    public async getMatchInProgressRegistered() {
        const entries = this.valorantGameSessionManager.getView();
        if (entries === null) {
            throw new NotFoundException();
        }

        return entries;
    }

    @Get('/match-states/:matchId')
    @ApiOkResponse({
        description:
            'Returns the current match status for the specified match ID.',
        type: MatchStatusDTO,
    })
    @ApiNotFoundResponse({
        description: 'Returned when the specified match ID is not found.',
    })
    public async getMatchStateById(matchId: SimpleUUID) {
        const entry = this.valorantGameSessionManager.getKeyView(matchId);
        if (entry === null) {
            throw new NotFoundException();
        }

        return entry;
    }
}
