import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ShutdownManager } from '@/modules/ShutdownModule/ShutdownManager';

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
    @HttpCode(HttpStatus.ACCEPTED.valueOf())
    public async requestShutdown() {
        this.manager.shutdown();
    }
}