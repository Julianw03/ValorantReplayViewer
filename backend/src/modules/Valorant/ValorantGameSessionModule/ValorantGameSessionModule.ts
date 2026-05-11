import { Module } from '@nestjs/common';
import { RiotClientModule } from '@/core/riotclient/RiotClientModule';
import { ValorantGameSessionManager } from '@/modules/Valorant/ValorantGameSessionModule/ValorantGameSessionManager';
import { EventBusModule } from '@/core/events/EventBusModule';
import { ValorantGameSessionController } from '@/modules/Valorant/ValorantGameSessionModule/ValorantGameSessionController';
import { ValorantGameChampSelectRCUAdapter } from '@/modules/Valorant/ValorantGameSessionModule/ValorantGameChampSelectRCUAdapter';
import { ValorantMatchEndedRCUAdapter } from '@/modules/Valorant/ValorantGameSessionModule/ValorantMatchEndedRCUAdapter';
import { ValorantGameInProgressRCUAdapter } from '@/modules/Valorant/ValorantGameSessionModule/ValorantGameInProgressRCUAdapter';
import { ProductSessionModule } from '@/modules/ProductSessionManager/ProductSessionModule';

@Module({
    imports: [RiotClientModule, EventBusModule, ProductSessionModule],
    controllers: [ValorantGameSessionController],
    providers: [
        ValorantGameSessionManager,
        ValorantGameChampSelectRCUAdapter,
        ValorantMatchEndedRCUAdapter,
        ValorantGameInProgressRCUAdapter,
    ],
    exports: [ValorantGameSessionManager],
})
export class ValorantGameSessionModule {}
