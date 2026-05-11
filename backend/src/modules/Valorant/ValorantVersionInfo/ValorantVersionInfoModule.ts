import { Module } from '@nestjs/common';
import { ValorantAssetAPIModule } from '@/integrations/NotOfficer/ValorantAssetAPIModule';
import { ValorantVersionInfoManager } from '@/modules/Valorant/ValorantVersionInfo/ValorantVersionInfoManager';
import { EventBusModule } from '@/core/events/EventBusModule';
import { ValorantVersionInfoController } from '@/modules/Valorant/ValorantVersionInfo/ValorantVersionInfoController';
import { ProductSessionModule } from '@/modules/ProductSessionManager/ProductSessionModule';

@Module({
    imports: [ValorantAssetAPIModule, EventBusModule, ProductSessionModule],
    providers: [ValorantVersionInfoManager, ValorantVersionInfoController],
    controllers: [ValorantVersionInfoController],
    exports: [ValorantVersionInfoManager],
})
export class ValorantVersionInfoModule {
}