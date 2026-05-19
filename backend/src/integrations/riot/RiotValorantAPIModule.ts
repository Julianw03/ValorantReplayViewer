import { Module } from '@nestjs/common';
import { EntitlementTokenModule } from '@/modules/EntitlementTokenModule/EntitlementTokenModule';
import { RiotValorantAPIManager } from '@/integrations/riot/RiotValorantAPIManager';
import { ValorantVersionInfoModule } from '@/modules/Valorant/ValorantVersionInfo/ValorantVersionInfoModule';
import { EventBusModule } from '@/core/events/EventBusModule';

@Module({
    imports: [EntitlementTokenModule, ValorantVersionInfoModule, EventBusModule],
    providers: [RiotValorantAPIManager],
    exports: [RiotValorantAPIManager],
})
export class RiotValorantAPIModule {
}
