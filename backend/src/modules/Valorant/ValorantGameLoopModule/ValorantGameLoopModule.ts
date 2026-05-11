import { Module } from '@nestjs/common';
import { RiotClientModule } from '@/core/riotclient/RiotClientModule';
import { EventBusModule } from '@/core/events/EventBusModule';
import { ValorantGameLoopRCUAdapter } from '@/modules/Valorant/ValorantGameLoopModule/ValorantGameLoopRCUAdapter';
import { ValorantGameLoopController } from '@/modules/Valorant/ValorantGameLoopModule/ValorantGameLoopController';
import { ValorantGameLoopManager } from '@/modules/Valorant/ValorantGameLoopModule/ValorantGameLoopManager';
import { RiotValorantAPIModule } from '@/integrations/riot/RiotValorantAPIModule';
import { ProductSessionModule } from '@/modules/ProductSessionModule/ProductSessionModule';

@Module({
    imports: [RiotClientModule, EventBusModule, RiotValorantAPIModule, ProductSessionModule],
    controllers: [ValorantGameLoopController],
    providers: [ValorantGameLoopManager, ValorantGameLoopRCUAdapter],
    exports: [ValorantGameLoopManager],
})
export class ValorantGameLoopModule {}
