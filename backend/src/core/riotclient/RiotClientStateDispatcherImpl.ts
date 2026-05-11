import { RiotClientStateDispatcher } from '@/core/riotclient/RiotClientStateDispatcher';
import { Injectable } from '@nestjs/common';
import { Observable, share, Subject } from 'rxjs';
import { RCUConnectionState } from '@/core/riotclient/connection/RCUConnectionState';

@Injectable()
export class RiotClientStateDispatcherImpl implements RiotClientStateDispatcher {
    protected readonly handler = new Subject<RCUConnectionState>();

    constructor() {}

    async emitRCUConnectionState(connectionState: RCUConnectionState): Promise<void> {
        this.handler.next(connectionState);
    }

    onRCUConnectionState(): Observable<RCUConnectionState> {
        return this.handler.asObservable().pipe(share());
    }
}