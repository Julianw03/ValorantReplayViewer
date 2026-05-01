import { Module } from '@nestjs/common';
import { RiotClientModule } from '@/riotclient/RiotClientModule';
import { ValorantMatchStatsManager } from '@/caching/ValorantMatchStatsModule/ValorantMatchStatsManager';
import { EventBusModule } from '@/events/EventBusModule';
import { ValorantMatchStatsController } from '@/caching/ValorantMatchStatsModule/ValorantMatchStatsController';
import { RiotValorantAPIModule } from '@/api/riot/RiotValorantAPIModule';
import { ProductSessionModule } from '@/caching/ProductSessionManager/ProductSessionModule';
import { PuuidToPlayerAliasModule } from '@/caching/PuuidToPlayerAliasManager/PuuidToPlayerAliasModule';

@Module({
    imports: [RiotClientModule, RiotValorantAPIModule, EventBusModule, ProductSessionModule, PuuidToPlayerAliasModule],
    controllers: [ValorantMatchStatsController],
    providers: [ValorantMatchStatsManager],
    exports: [ValorantMatchStatsManager],
})
export class ValorantMatchStatsModule {
}
