import { ValorantAssetAPIModule } from '@/integrations/NotOfficer/ValorantAssetAPIModule';
import { Module } from '@nestjs/common';
import { MapAssetResolverManager } from '@/modules/AssetResolvingModule/MapAssetResolverManager';
import { MapAssetResolverController } from '@/modules/AssetResolvingModule/MapAssetResolverController';

@Module({
    imports: [ValorantAssetAPIModule],
    providers: [MapAssetResolverManager, MapAssetResolverController],
    controllers: [MapAssetResolverController],
    exports: [MapAssetResolverManager]
})
export class MapAssetResolverModule {}