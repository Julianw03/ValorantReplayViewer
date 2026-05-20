import { Module } from '@nestjs/common';
import { RiotClientModule } from '@/core/riotclient/RiotClientModule';
import { ValorantMatchStatsManager } from '@/modules/Valorant/ValorantMatchStatsModule/ValorantMatchStatsManager';
import { EventBusModule } from '@/core/events/EventBusModule';
import { ValorantMatchStatsController } from '@/modules/Valorant/ValorantMatchStatsModule/ValorantMatchStatsController';
import { RiotValorantAPIModule } from '@/integrations/riot/RiotValorantAPIModule';
import { PuuidToPlayerAliasModule } from '@/modules/PuuidToPlayerAliasModule/PuuidToPlayerAliasModule';
import { ProductSessionModule } from '@/modules/ProductSessionModule/ProductSessionModule';

@Module({
    imports: [RiotClientModule, RiotValorantAPIModule, ProductSessionModule, EventBusModule, PuuidToPlayerAliasModule],
    controllers: [ValorantMatchStatsController],
    providers: [ValorantMatchStatsManager],
    exports: [ValorantMatchStatsManager],
})
export class ValorantMatchStatsModule {
}
