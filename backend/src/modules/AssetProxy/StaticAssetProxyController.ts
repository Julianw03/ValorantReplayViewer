import {
    BadRequestException,
    Controller,
    Get,
    Query,
    Res,
} from '@nestjs/common';
import { type Response } from 'express';
import { StaticAssetProxyService } from '@/modules/AssetProxy/StaticAssetProxyService';

@Controller({
    path: 'assets/proxy',
    version: '1',
})
export class StaticAssetProxyController {
    constructor(private readonly proxyService: StaticAssetProxyService) {}

    @Get()
    async proxy(
        @Query('url') url: string,
        @Res() res: Response,
    ): Promise<void> {
        if (!url) {
            throw new BadRequestException('Missing required query parameter: url');
        }

        let asset: { buffer: Buffer; contentType: string };
        try {
            asset = await this.proxyService.fetch(url);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Proxy fetch failed';
            res.status(502).json({ message });
            return;
        }

        res.setHeader('Content-Type', asset.contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
        res.end(asset.buffer);
    }
}
