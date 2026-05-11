import { OnEvent } from '@nestjs/event-emitter';
import { RCUMessage } from '@/core/riotclient/messaging/RCUMessage';
import { Logger } from '@nestjs/common';

export class RiotClientListener {
    private readonly logger = new Logger(this.constructor.name);

    @OnEvent('rcuMessage', { async: true })
    private async onRcuMessage(message: RCUMessage) {
        this.logger.verbose(
            `${message.type} ${message.uri} ${JSON.stringify(message.data)}`,
        );
    }
}
