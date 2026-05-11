import { Module } from '@nestjs/common';
import { RiotClientModule } from '@/core/riotclient/RiotClientModule';
import { PuuidToPlayerAliasManager } from '@/modules/PuuidToPlayerAliasModule/PuuidToPlayerAliasManager';

@Module({
    imports: [RiotClientModule],
    providers: [PuuidToPlayerAliasManager],
    exports: [PuuidToPlayerAliasManager],
})
export class PuuidToPlayerAliasModule {
}