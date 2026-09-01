import { Module } from '@nestjs/common';
import { RiotClientModule } from '@/core/riotclient/RiotClientModule';
import { EventBusModule } from '@/core/events/EventBusModule';
import { SocialPresenceManager } from '@/modules/SocialPresence/SocialPresenceManager';
import { SocialPresenceRCUAdapter } from '@/modules/SocialPresence/SocialPresenceRCUAdapter';
import { SocialPresenceController } from '@/modules/SocialPresence/SocialPresenceController';

@Module({
    imports: [RiotClientModule, EventBusModule],
    providers: [SocialPresenceManager, SocialPresenceRCUAdapter],
    controllers: [SocialPresenceController],
    exports: [SocialPresenceManager],
})
export class SocialPresenceModule {}
