import { Module } from '@nestjs/common';
import { EntitlementTokenModule } from '@/caching/EntitlementTokenModule/EntitlementTokenModule';
import { ProductSessionModule } from '@/caching/ProductSessionManager/ProductSessionModule';
import { RiotValorantAPIManager } from '@/api/riot/RiotValorantAPIManager';
import { ValorantVersionInfoModule } from '@/caching/ValorantVersionInfo/ValorantVersionInfoModule';
import { EventBusModule } from '@/events/EventBusModule';

@Module({
    imports: [EntitlementTokenModule, ProductSessionModule, ValorantVersionInfoModule, EventBusModule],
    providers: [RiotValorantAPIManager],
    exports: [RiotValorantAPIManager],
})
export class RiotValorantAPIModule {}
