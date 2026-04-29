import {
    BadRequestException,
    ClassSerializerInterceptor,
    Controller,
    Get,
    HttpCode, HttpStatus,
    Logger,
    NotFoundException,
    Param,
    Post,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { RiotClientReadyGuard } from '@/riotclient/RiotClientReadyGuard';
import { ValorantMatchStatsManager } from '@/caching/ValorantMatchStatsModule/ValorantMatchStatsManager';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import {
    AsyncResultSchema,
    Failure,
    Pending,
    Success,
} from '#/utils/AsyncResult';
import { RiotMatchApiResponseDTO } from '@/caching/ValorantMatchStatsModule/RiotMatchApiResponseDTO';
import { ProductSessionGuard, RequiredProduct } from '@/caching/ProductSessionManager/ProductSessionGuard';

@RequiredProduct('valorant')
@UseGuards(RiotClientReadyGuard, ProductSessionGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller({
    version: '1',
    path: 'caching/valorant-game-stats',
})
export class ValorantMatchStatsController {
    private readonly logger = new Logger(this.constructor.name);

    constructor(
        protected readonly valorantMatchEndedManager: ValorantMatchStatsManager,
    ) {}

    @Get('')
    @ApiExtraModels(Pending, Success, Failure, RiotMatchApiResponseDTO)
    @ApiOkResponse({
        schema: {
            type: 'object',
            additionalProperties: AsyncResultSchema(
                getSchemaPath(RiotMatchApiResponseDTO),
            ),
        },
    })
    public async getMatchOverview() {
        const view = this.valorantMatchEndedManager.getView();

        if (view === null) {
            throw new NotFoundException();
        }

        return view;
    }

    @Get(':id')
    @ApiExtraModels(Success, Failure, Pending, RiotMatchApiResponseDTO)
    @ApiOkResponse({
        schema: AsyncResultSchema(getSchemaPath(RiotMatchApiResponseDTO)),
    })
    public async getById(@Param('id') id: UUID) {
        if (!id) return new BadRequestException();
        const viewEntry = this.valorantMatchEndedManager.getEntryView(id);

        if (viewEntry === null) {
            throw new NotFoundException('No data for the given match ID');
        }

        return viewEntry;
    }

    @Post(':id/fetch')
    @HttpCode(HttpStatus.ACCEPTED.valueOf())
    public triggerFetch(@Param('id') id: UUID) {
        if (!id) throw new BadRequestException();
        this.valorantMatchEndedManager.requestMatchFetch(id);
    }
}
