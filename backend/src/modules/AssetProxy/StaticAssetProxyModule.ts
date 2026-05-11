import { Module } from '@nestjs/common';
import { StaticAssetProxyController } from '@/modules/AssetProxy/StaticAssetProxyController';
import { StaticAssetProxyService } from '@/modules/AssetProxy/StaticAssetProxyService';

@Module({
    providers: [StaticAssetProxyService],
    controllers: [StaticAssetProxyController],
})
export class StaticAssetProxyModule {}
