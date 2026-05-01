import { Module } from '@nestjs/common';
import { RiotClientModule } from '@/riotclient/RiotClientModule';
import { EntitlementTokenModule } from '@/caching/EntitlementTokenModule/EntitlementTokenModule';
import { ProductSessionModule } from '@/caching/ProductSessionManager/ProductSessionModule';
import { ReplayFetchManager } from '@/plugins/replay/remote/ReplayFetchManager';
import { ReplayInjectManager } from '@/plugins/replay/injector/ReplayInjectManager';
import { EventBusModule } from '@/events/EventBusModule';
import { ReplayRemoteController } from '@/plugins/replay/remote/ReplayRemoteController';
import { ReplayInjectController } from '@/plugins/replay/injector/ReplayInjectController';
import { ValorantGameLoopModule } from '@/caching/ValorantGameLoop/ValorantGameLoopModule';
import { RiotValorantAPIModule } from '@/api/riot/RiotValorantAPIModule';
import { ValorantMatchStatsModule } from '@/caching/ValorantMatchStatsModule/ValorantMatchStatsModule';
import { ConfigModule } from '@nestjs/config';
import { ReplayIOManagerV2 } from '@/plugins/replay/storage/ReplayIOManagerV2';
import { ReplayIOController } from '@/plugins/replay/storage/ReplayIOController';
import { PuuidToPlayerAliasModule } from '@/caching/PuuidToPlayerAliasManager/PuuidToPlayerAliasModule';

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
    providers: [ReplayIOManagerV2, ReplayFetchManager, ReplayInjectManager],
    controllers: [
        ReplayIOController,
        ReplayRemoteController,
        ReplayInjectController,
    ],
})
export class ReplayModule {
}
