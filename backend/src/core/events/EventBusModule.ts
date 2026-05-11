import { Module } from '@nestjs/common';
import { SimpleEventBusImpl } from '@/core/events/impl/SimpleEventBusImpl';
import { SimpleEventBus } from '@/core/events/SimpleEventBus';
import { WSEventPublisher } from '@/core/events/WSEventPublisher';

@Module({
    imports: [],
    providers: [
        {
            provide: SimpleEventBus,
            useClass: SimpleEventBusImpl,
        },
        WSEventPublisher,
    ],
    exports: [SimpleEventBus],
})
export class EventBusModule {}
