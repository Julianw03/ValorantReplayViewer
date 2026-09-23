import { Module } from '@nestjs/common';
import { PathProviderModule } from '@/modules/PathProvider/PathProviderModule';
import { ReplayDBService } from '@/modules/Valorant/ValorantReplays/storage/db/ReplayDBService';
import { ReplayDBConnection } from '@/modules/Valorant/ValorantReplays/storage/db/ReplayDBConnection';

@Module({
    imports: [PathProviderModule],
    providers: [ReplayDBConnection, ReplayDBService],
    exports: [ReplayDBService],
})
export class ReplayDBModule {}
