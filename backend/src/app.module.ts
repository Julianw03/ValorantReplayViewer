import { Module } from '@nestjs/common';
import { RiotClientModule } from '@/riotclient/RiotClientModule';
import { ProductSessionModule } from '@/caching/ProductSessionManager/ProductSessionModule';
import { ValorantGameSessionModule } from '@/caching/ValorantGameSessionModule/ValorantGameSessionModule';
import { AccountNameAndTagLineModule } from '@/caching/AccountNameAndTagLineModule/AccountNameAndTagLineModule';
import { EntitlementTokenModule } from '@/caching/EntitlementTokenModule/EntitlementTokenModule';
import { ValorantMatchStatsModule } from '@/caching/ValorantMatchStatsModule/ValorantMatchStatsModule';
import { EventBusModule } from '@/events/EventBusModule';
import { ConfigModule } from '@nestjs/config';
import { ReplayModule } from '@/plugins/replay/ReplayModule';
import { ValorantGameLoopModule } from '@/caching/ValorantGameLoop/ValorantGameLoopModule';
import { RiotValorantAPIModule } from '@/api/riot/RiotValorantAPIModule';
import { ValorantAssetAPIModule } from '@/api/NotOfficer/ValorantAssetAPIModule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { MapAssetResolverModule } from '@/caching/AssetResolving/MapAssetResolverModule';
import { StaticAssetProxyModule } from '@/caching/AssetProxy/StaticAssetProxyModule';
import { ValorantVersionInfoModule } from '@/caching/ValorantVersionInfo/ValorantVersionInfoModule';
import { appConfig } from '@/config/configLoader';
import { ConfigurationModule } from '@/config/ConfigurationModule';
import { getPackageAwarePath } from '@/utils/PackagedPath';
import { PuuidToPlayerAliasModule } from '@/caching/PuuidToPlayerAliasManager/PuuidToPlayerAliasModule';


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
