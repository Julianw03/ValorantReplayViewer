import { Module } from '@nestjs/common';
import { StaticAssetProxyController } from '@/modules/AssetProxyModule/StaticAssetProxyController';
import { StaticAssetProxyService } from '@/modules/AssetProxyModule/StaticAssetProxyService';

@Module({
    providers: [StaticAssetProxyService],
    controllers: [StaticAssetProxyController],
})
export class StaticAssetProxyModule {}
