import { Module } from '@nestjs/common';
import { RiotClientModule } from '@/core/riotclient/RiotClientModule';
import { EntitlementTokenManager } from '@/modules/EntitlementTokenModule/EntitlementTokenManager';
import { EntitlementTokenRCUAdapter } from '@/modules/EntitlementTokenModule/EntitlementTokenRCUAdapter';

@Module({
    imports: [RiotClientModule],
    providers: [EntitlementTokenManager, EntitlementTokenRCUAdapter],
    exports: [EntitlementTokenManager],
})
export class EntitlementTokenModule {}
