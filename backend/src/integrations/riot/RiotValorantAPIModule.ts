import { Module } from '@nestjs/common';
import { EntitlementTokenModule } from '@/modules/EntitlementTokenModule/EntitlementTokenModule';
import { ProductSessionModule } from '@/modules/ProductSessionModule/ProductSessionModule';
import { RiotValorantAPIManager } from '@/integrations/riot/RiotValorantAPIManager';
import { ValorantVersionInfoModule } from '@/modules/Valorant/ValorantVersionInfo/ValorantVersionInfoModule';
import { EventBusModule } from '@/core/events/EventBusModule';

@Module({
    imports: [EntitlementTokenModule, ProductSessionModule, ValorantVersionInfoModule, EventBusModule],
    providers: [RiotValorantAPIManager],
    exports: [RiotValorantAPIManager],
})
export class RiotValorantAPIModule {}
