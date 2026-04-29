import { Module } from '@nestjs/common';
import { RiotClientModule } from '@/riotclient/RiotClientModule';
import { PuuidToPlayerAliasManager } from '@/caching/PuuidToPlayerAliasManager/PuuidToPlayerAliasManager';

@Module({
    imports: [RiotClientModule],
    providers: [PuuidToPlayerAliasManager],
    exports: [PuuidToPlayerAliasManager]
})
export class PuuidToPlayerAliasModule {}