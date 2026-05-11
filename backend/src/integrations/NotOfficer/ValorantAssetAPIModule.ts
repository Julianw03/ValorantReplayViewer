import { Module } from '@nestjs/common';
import { ValorantAssetAPI } from '@/integrations/NotOfficer/ValorantAssetAPI';
import { VALORANT_API_BASE_URL } from '@/integrations/NotOfficer/ValorantAPITokens';

@Module({
    imports: [],
    providers: [
        {
            provide: VALORANT_API_BASE_URL,
            useValue: 'https://valorant-api.com',
        },
        ValorantAssetAPI],
    exports: [ValorantAssetAPI],
})
export class ValorantAssetAPIModule {
}