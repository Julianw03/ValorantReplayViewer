import { Controller, Delete, Get, HttpCode, HttpStatus, Logger, NotFoundException, Param, Post } from '@nestjs/common';
import { ReplayIOManagerV2 } from '@/plugins/replay/storage/ReplayIOManagerV2';
import { type InjectStatus, ReplayInjectManager } from '@/plugins/replay/injector/ReplayInjectManager';
import { ApiOperation } from '@nestjs/swagger';

@Controller({
    path: 'plugins/replay/injector',
    version: '1',
})
export class ReplayInjectController {
    private readonly logger = new Logger(ReplayInjectController.name);

    constructor(
        protected readonly replayIOManager: ReplayIOManagerV2,
        protected readonly replayInjectManager: ReplayInjectManager,
    ) {
    }

    @Post('matches/:matchId')
    @ApiOperation({
        summary: 'Start injection',
        description: 'Starts replay injection for a stored match.',
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async startInject(@Param('matchId') matchId: string): Promise<void> {
        if (!this.replayIOManager.matchRegistered(matchId)) {
            throw new NotFoundException(
                `Match ${matchId} not found in storage`,
            );
        }
        this.replayInjectManager.startInject(matchId).catch((err) => {
            this.logger.warn('Error occured', err);
        });
    }

    @Get('status')
    @ApiOperation({
        summary: 'Get injector status',
        description: 'Returns current replay injection status.',
    })
    getInjectStatus(): InjectStatus {
        const status = this.replayInjectManager.getView();
        if (!status) {
            throw new NotFoundException();
        }
        return status;
    }

    @Delete('')
    @ApiOperation({
        summary: 'Cancel injection',
        description: 'Stops any running replay injection process.',
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    cancelInject(): void {
        this.replayInjectManager.cancelInject();
    }
}
