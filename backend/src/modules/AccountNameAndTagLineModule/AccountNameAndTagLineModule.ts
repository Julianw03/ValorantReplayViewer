import { Module } from '@nestjs/common';
import { RiotClientModule } from '@/core/riotclient/RiotClientModule';
import { AccountNameAndTagLineManager } from '@/modules/AccountNameAndTagLineModule/AccountNameAndTagLineManager';
import { EventBusModule } from '@/core/events/EventBusModule';
import { AccountNameAndTagLineController } from '@/modules/AccountNameAndTagLineModule/AccountNameAndTagLineController';
import { AccountNameAndTagLineRCUAdapter } from '@/modules/AccountNameAndTagLineModule/AccountNameAndTagLineRCUAdapter';

@Module({
    imports: [RiotClientModule, EventBusModule],
    controllers: [AccountNameAndTagLineController],
    providers: [AccountNameAndTagLineManager, AccountNameAndTagLineRCUAdapter],
    exports: [AccountNameAndTagLineManager],
})
export class AccountNameAndTagLineModule {}
