import { Module } from '@nestjs/common';
import { RiotClientModule } from '@/core/riotclient/RiotClientModule';
import { ProductSessionModule } from '@/modules/ProductSessionManager/ProductSessionModule';
import { ValorantGameSessionModule } from '@/modules/Valorant/ValorantGameSessionModule/ValorantGameSessionModule';
import { AccountNameAndTagLineModule } from '@/modules/AccountNameAndTagLineModule/AccountNameAndTagLineModule';
import { EntitlementTokenModule } from '@/modules/EntitlementTokenModule/EntitlementTokenModule';
import { ValorantMatchStatsModule } from '@/modules/Valorant/ValorantMatchStatsModule/ValorantMatchStatsModule';
import { EventBusModule } from '@/core/events/EventBusModule';
import { ConfigModule } from '@nestjs/config';
import { ReplayModule } from '@/modules/Valorant/ValorantReplays/ReplayModule';
import { ValorantGameLoopModule } from '@/modules/Valorant/ValorantGameLoop/ValorantGameLoopModule';
import { RiotValorantAPIModule } from '@/integrations/riot/RiotValorantAPIModule';
import { ValorantAssetAPIModule } from '@/integrations/NotOfficer/ValorantAssetAPIModule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { MapAssetResolverModule } from '@/modules/AssetResolving/MapAssetResolverModule';
import { StaticAssetProxyModule } from '@/modules/AssetProxy/StaticAssetProxyModule';
import { ValorantVersionInfoModule } from '@/modules/Valorant/ValorantVersionInfo/ValorantVersionInfoModule';
import { appConfig } from '@/config/configLoader';
import { ConfigurationModule } from '@/config/ConfigurationModule';
import { getPackageAwarePath } from '@/utils/PackagedPath';
import { PuuidToPlayerAliasModule } from '@/modules/PuuidToPlayerAliasManager/PuuidToPlayerAliasModule';


@Module({
    imports: [
        ServeStaticModule.forRoot({
            rootPath: getPackageAwarePath('public'),
            serveRoot: '/',
        }),
        ConfigModule.forRoot({
            load: [appConfig],
            isGlobal: true,
        }),
        ConfigurationModule,
        RiotClientModule,
        ProductSessionModule,
        AccountNameAndTagLineModule,
        ValorantGameSessionModule,
        PuuidToPlayerAliasModule,
        EntitlementTokenModule,
        ValorantMatchStatsModule,
        ValorantGameLoopModule,
        RiotValorantAPIModule,
        ValorantAssetAPIModule,
        MapAssetResolverModule,
        StaticAssetProxyModule,
        ValorantVersionInfoModule,
        EventBusModule,
        ReplayModule,
    ],
})
export class AppModule {
}
