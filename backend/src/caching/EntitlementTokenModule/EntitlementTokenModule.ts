import { Module } from '@nestjs/common';
import { RiotClientModule } from '@/riotclient/RiotClientModule';
import { EntitlementTokenManager } from '@/caching/EntitlementTokenModule/EntitlementTokenManager';
import { EntitlementTokenRCUAdapter } from '@/caching/EntitlementTokenModule/EntitlementTokenRCUAdapter';

@Module({
    imports: [RiotClientModule],
    providers: [EntitlementTokenManager, EntitlementTokenRCUAdapter],
    exports: [EntitlementTokenManager],
})
export class EntitlementTokenModule {}
