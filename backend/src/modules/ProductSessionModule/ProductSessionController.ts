import { Controller, Get, Logger, NotFoundException, Param } from '@nestjs/common';
import { ProductSessionManager } from '@/modules/ProductSessionModule/ProductSessionManager';

@Controller({
    path: 'caching/product-sessions',
    version: '1',
})
export class ProductSessionController {
    private readonly logger = new Logger(this.constructor.name);

    constructor(
        private readonly productSessionManager: ProductSessionManager,
    ) {
    }


    @Get('')
    public async getProductSessions() {
        return this.productSessionManager.getView();
    }

    @Get(':productSessionId')
    public async getProductSessionById(
        @Param('productSessionId') productSessionId: string,
    ) {
        const optSession = this.productSessionManager.getKeyView(productSessionId);
        if (!optSession) {
            throw new NotFoundException();
        }
        return optSession;
    }
}
