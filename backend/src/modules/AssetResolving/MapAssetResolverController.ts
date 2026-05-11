import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { MapAssetResolverManager } from '@/modules/AssetResolving/MapAssetResolverManager';

@Controller({
    path: 'assets/maps',
    version: '1'
})
export class MapAssetResolverController {

    constructor(
        protected readonly assetResolver: MapAssetResolverManager
    ) {}


    @Get('/:mapPath')
    public async getMapAsset(@Param('mapPath') mapPath: string) {
        const mapAsset = this.assetResolver.getKeyView(mapPath);
        if (!mapAsset) {
            throw new NotFoundException(`Map asset not found for path: ${mapPath}`);
        }
        return mapAsset;
    }

    @Get('/')
    public async getAllMapAssets() {
        const allAssets = this.assetResolver.getView();
        if (!allAssets) {
            throw new NotFoundException(`Map assets not ready yet.`);
        }
        return allAssets;
    }
}