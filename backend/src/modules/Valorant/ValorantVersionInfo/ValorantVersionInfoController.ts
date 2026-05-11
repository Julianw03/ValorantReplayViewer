import { Controller, Get, UseGuards } from '@nestjs/common';
import { ValorantVersionInfoManager } from '@/modules/Valorant/ValorantVersionInfo/ValorantVersionInfoManager';
import { ProductSessionGuard, RequiredProduct } from '@/modules/ProductSessionModule/ProductSessionGuard';

@RequiredProduct('valorant')
@UseGuards(ProductSessionGuard)
@Controller({
    path: 'caching/valorant-version-info',
    version: '1',
})
export class ValorantVersionInfoController {
    constructor(protected readonly versionInfoManager: ValorantVersionInfoManager) {
    }

    @Get('')
    public async getVersionInfo() {
        return this.versionInfoManager.getView();
    }
}