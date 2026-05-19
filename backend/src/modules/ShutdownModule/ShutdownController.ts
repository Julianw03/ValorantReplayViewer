import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ShutdownManager } from '@/modules/ShutdownModule/ShutdownManager';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller({
    path: 'process-control',
    version: '1',
})
export class ShutdownController {

    constructor(
        protected readonly manager: ShutdownManager,
    ) {
    }

    @Post('shutdown')
    @ApiOperation({
        summary: 'Shutdown the application',
        description: 'The actual shutdown happens after a certain delay to allow this request to be fulfilled.',
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Application will be shutdown shortly.',
    })
    @HttpCode(HttpStatus.ACCEPTED.valueOf())
    public async requestShutdown() {
        this.manager.shutdown();
    }
}