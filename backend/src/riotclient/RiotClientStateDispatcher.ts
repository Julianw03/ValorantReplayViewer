import { Observable } from 'rxjs';
import { RCUConnectionState } from '@/riotclient/connection/RCUConnectionState';

export interface RiotClientStateDispatcher {
    onRCUConnectionState(): Observable<RCUConnectionState>;
    emitRCUConnectionState(connectionState: RCUConnectionState): Promise<void>;
}