import { Module } from '@nestjs/common';
import { RiotClientModule } from '@/core/riotclient/RiotClientModule';
import { EntitlementTokenModule } from '@/modules/EntitlementTokenModule/EntitlementTokenModule';
import { ProductSessionModule } from '@/modules/ProductSessionModule/ProductSessionModule';
import { ReplayFetchManager } from '@/modules/Valorant/ValorantReplays/remote/ReplayFetchManager';
import { EventBusModule } from '@/core/events/EventBusModule';
import { ReplayRemoteController } from '@/modules/Valorant/ValorantReplays/remote/ReplayRemoteController';
import { ReplayInjectController } from '@/modules/Valorant/ValorantReplays/injector/ReplayInjectController';
import { ValorantGameLoopModule } from '@/modules/Valorant/ValorantGameLoopModule/ValorantGameLoopModule';
import { RiotValorantAPIModule } from '@/integrations/riot/RiotValorantAPIModule';
import { ValorantMatchStatsModule } from '@/modules/Valorant/ValorantMatchStatsModule/ValorantMatchStatsModule';
import { ConfigModule } from '@nestjs/config';
import { ReplayManager } from '@/modules/Valorant/ValorantReplays/storage/ReplayManager';
import { ReplayController } from '@/modules/Valorant/ValorantReplays/storage/ReplayController';
import { PuuidToPlayerAliasModule } from '@/modules/PuuidToPlayerAliasModule/PuuidToPlayerAliasModule';
import { ValorantMatchHistoryModule } from '@/modules/Valorant/MatchHistory/MatchHistoryModule';
import { ReplayInjectManagerV2 } from '@/modules/Valorant/ValorantReplays/injector/ReplayInjectManagerV2';
import { ReplayDBModule } from '@/modules/Valorant/ValorantReplays/storage/db/ReplayDBModule';
import { PathProviderModule } from '@/modules/PathProvider/PathProviderModule';

@Module({
    imports: [
        RiotClientModule,
        EntitlementTokenModule,
        ProductSessionModule,
        ValorantMatchStatsModule,
        ValorantMatchHistoryModule,
        EventBusModule,
        ValorantGameLoopModule,
        PuuidToPlayerAliasModule,
        RiotValorantAPIModule,
        ConfigModule,
        PathProviderModule,
        ReplayDBModule,
    ],
    providers: [ReplayManager, ReplayFetchManager, ReplayInjectManagerV2],
    controllers: [
        ReplayController,
        ReplayRemoteController,
        ReplayInjectController,
    ],
})
export class ReplayModule {
}
