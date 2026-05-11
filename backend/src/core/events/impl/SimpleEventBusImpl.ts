import { SimpleEventBus } from '@/core/events/SimpleEventBus';
import { EventType } from '@/core/events/EventTypes';
import { BasicEvent } from '@/core/events/BasicEvent';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SimpleEventBusImpl implements SimpleEventBus {
    private readonly eventEmitter = new EventEmitter2({
        delimiter: ':',
        wildcard: true,
    });

    constructor() {}

    private readonly logger = new Logger(this.constructor.name);

    publish<T extends EventType>(event: BasicEvent<T>) {
        if (!event.source || !event.type) {
            throw new Error('Event must have a source and type');
        }
        this.eventEmitter.emitAsync(`${event.source}:${event.type}`, event);
    }

    subscribeOnAll<T extends EventType>(
        handler: (event: BasicEvent<T>) => void,
    ) {
        const topic = '*:*';
        this.eventEmitter.on(topic, handler);

        return () => {
            this.eventEmitter.off(topic, handler);
        };
    }

    subscribeOnSource<T extends EventType>(
        source: string,
        handler: (event: BasicEvent<T>) => void,
    ): () => void {
        const topic = `${source}:*`;
        this.eventEmitter.on(topic, handler);

        return () => {
            this.eventEmitter.off(topic, handler);
        };
    }

    subscribeOnType<T extends EventType>(
        type: T,
        handler: (event: BasicEvent<T>) => void,
    ): () => void {
        const topic = `*:${type}`;
        this.eventEmitter.on(topic, handler);

        return () => {
            this.eventEmitter.off(topic, handler);
        };
    }
}
