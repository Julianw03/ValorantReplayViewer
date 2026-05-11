import {
    ClassSerializerInterceptor,
    Controller,
    Get,
    Logger,
    NotFoundException,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { RiotClientReadyGuard } from '@/core/riotclient/RiotClientReadyGuard';
import { ValorantGameLoopManager } from '@/modules/Valorant/ValorantGameLoop/ValorantGameLoopManager';
import { ProductSessionGuard, RequiredProduct } from '@/modules/ProductSessionManager/ProductSessionGuard';

@RequiredProduct('valorant')
@UseGuards(RiotClientReadyGuard, ProductSessionGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller({
    version: '1',
    path: 'caching/valorant-loop-session',
})
export class ValorantGameLoopController {
    private readonly logger = new Logger(this.constructor.name);

    constructor(
        protected readonly valorantGameLoopSessionManager: ValorantGameLoopManager,
    ) {}

    @Get('/state')
    @ApiOkResponse({
        description: 'State of the valorant session',
    })
    @ApiOperation({
        summary: 'Current session state',
        description: 'Current gamplay state of the valorant session',
    })
    public async getState() {
        const state = this.valorantGameLoopSessionManager.getView();
        if (state === null) {
            throw new NotFoundException(`State not ready yet.`);
        }
        return state;
    }
}
