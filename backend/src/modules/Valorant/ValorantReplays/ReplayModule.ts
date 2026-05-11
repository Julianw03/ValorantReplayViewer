import { Module } from '@nestjs/common';
import { RiotClientModule } from '@/core/riotclient/RiotClientModule';
import { EntitlementTokenModule } from '@/modules/EntitlementTokenModule/EntitlementTokenModule';
import { ProductSessionModule } from '@/modules/ProductSessionManager/ProductSessionModule';
import { ReplayFetchManager } from '@/modules/Valorant/ValorantReplays/remote/ReplayFetchManager';
import { ReplayInjectManager } from '@/modules/Valorant/ValorantReplays/injector/ReplayInjectManager';
import { EventBusModule } from '@/core/events/EventBusModule';
import { ReplayRemoteController } from '@/modules/Valorant/ValorantReplays/remote/ReplayRemoteController';
import { ReplayInjectController } from '@/modules/Valorant/ValorantReplays/injector/ReplayInjectController';
import { ValorantGameLoopModule } from '@/modules/Valorant/ValorantGameLoop/ValorantGameLoopModule';
import { RiotValorantAPIModule } from '@/integrations/riot/RiotValorantAPIModule';
import { ValorantMatchStatsModule } from '@/modules/Valorant/ValorantMatchStatsModule/ValorantMatchStatsModule';
import { ConfigModule } from '@nestjs/config';
import { ReplayIOManager } from '@/modules/Valorant/ValorantReplays/storage/ReplayIOManager';
import { ReplayIOController } from '@/modules/Valorant/ValorantReplays/storage/ReplayIOController';
import { PuuidToPlayerAliasModule } from '@/modules/PuuidToPlayerAliasManager/PuuidToPlayerAliasModule';

@Module({
    imports: [
        RiotClientModule,
        EntitlementTokenModule,
        ProductSessionModule,
        ValorantMatchStatsModule,
        EventBusModule,
        ValorantGameLoopModule,
        PuuidToPlayerAliasModule,
        RiotValorantAPIModule,
        ConfigModule,
    ],
    providers: [ReplayIOManager, ReplayFetchManager, ReplayInjectManager],
    controllers: [
        ReplayIOController,
        ReplayRemoteController,
        ReplayInjectController,
    ],
})
export class ReplayModule {
}
