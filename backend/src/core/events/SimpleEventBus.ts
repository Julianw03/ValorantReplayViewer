import { EventType } from '@/core/events/EventTypes';
import { BasicEvent } from '@/core/events/BasicEvent';

export abstract class SimpleEventBus {
    abstract publish<T extends EventType>(event: BasicEvent<T>): void;

    abstract subscribeOnAll<T extends EventType>(
        handler: (event: BasicEvent<T>) => void,
    );

    abstract subscribeOnType<T extends EventType>(
        type: T,
        handler: (event: BasicEvent<T>) => void,
    ): () => void;

    abstract subscribeOnSource<T extends EventType>(
        source: string,
        handler: (event: BasicEvent<T>) => void,
    ): () => void;
}
