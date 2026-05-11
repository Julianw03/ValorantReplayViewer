import { Observable } from 'rxjs';
import { SimpleEventBus } from '@/core/events/SimpleEventBus';
import { EventType } from '@/core/events/EventTypes';
import { BasicEvent } from '@/core/events/BasicEvent';

export const onType = <T extends EventType>(
    eventBus: SimpleEventBus,
    eventType: T,
) => {
    return new Observable<BasicEvent<T>>((subscriber) => {
        const handler = (event: BasicEvent<T>) => subscriber.next(event);

        const unsubscribe = eventBus.subscribeOnType(eventType, handler);

        return () => {
            unsubscribe();
        };
    });
};

export const onSource = <T extends EventType>(
    eventBus: SimpleEventBus,
    source: string,
) => {
    return new Observable<BasicEvent<T>>((subscriber) => {
        const handler = (event: BasicEvent<T>) => subscriber.next(event);

        const unsubscribe = eventBus.subscribeOnSource(source, handler);

        return () => {
            unsubscribe();
        };
    });
};
