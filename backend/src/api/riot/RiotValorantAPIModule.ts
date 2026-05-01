import { Module } from '@nestjs/common';
import { EntitlementTokenModule } from '@/caching/EntitlementTokenModule/EntitlementTokenModule';
import { ProductSessionModule } from '@/caching/ProductSessionManager/ProductSessionModule';
import { RiotValorantAPI } from '@/api/riot/RiotValorantAPI';
import { ValorantVersionInfoModule } from '@/caching/ValorantVersionInfo/ValorantVersionInfoModule';

@Module({
    imports: [EntitlementTokenModule, ProductSessionModule, ValorantVersionInfoModule],
    providers: [RiotValorantAPI],
    exports: [RiotValorantAPI],
})
export class RiotValorantAPIModule {}
