import { Module } from '@nestjs/common';
import { RiotClientServiceImpl } from './RiotClientServiceImpl';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LockfileParameterAcquisitionStrategy } from './connection/LockfileParameterAcquisitionStrategy';
import {
    RIOT_CLIENT_PARAMETER_ACQUISITION_STRATEGY,
    RIOT_CLIENT_SERVICE,
    RIOT_CLIENT_STATE_DISPATCHING_SERVICE,
} from './RiotClientTokens';
import { RiotClientController } from './RiotClientController';
import { RiotClientStateDispatcherImpl } from '@/riotclient/RiotClientStateDispatcherImpl';
import { TrieRCUMessageDispatcher } from '@/riotclient/messaging/trie/TrieRCUMessageDispatcher';

@Module({
    imports: [EventEmitterModule.forRoot()],
    controllers: [RiotClientController],
    providers: [
        {
            provide: RIOT_CLIENT_PARAMETER_ACQUISITION_STRATEGY,
            useClass: LockfileParameterAcquisitionStrategy,
        },
        { provide: RIOT_CLIENT_SERVICE, useClass: RiotClientServiceImpl },
        { provide: RIOT_CLIENT_STATE_DISPATCHING_SERVICE, useClass: RiotClientStateDispatcherImpl },
        TrieRCUMessageDispatcher,
    ],
    exports: [RIOT_CLIENT_SERVICE, RIOT_CLIENT_STATE_DISPATCHING_SERVICE, TrieRCUMessageDispatcher],
})
export class RiotClientModule {
}
