import { RCUMessage, RCUMessageType } from '@/riotclient/messaging/RCUMessage';
import {
    _INTERNALS_READ_STATE,
    _INTERNALS_RESET_STATE,
    _INTERNALS_WRITE_STATE,
    GenericDataManager,
} from '@/caching/base/GenericDataManager';
import { OnEvent } from '@nestjs/event-emitter';
import { RiotClientService } from '@/riotclient/RiotClientService';
import { Logger } from '@nestjs/common';
import { RiotClientStateDispatcher } from '@/riotclient/RiotClientStateDispatcher';
import { ForwardedMessage, TrieRCUMessageDispatcher } from '@/riotclient/messaging/trie/TrieRCUMessageDispatcher';
import { RCUConnectionState } from '@/riotclient/connection/RCUConnectionState';
import { Subscription } from 'rxjs';
import { PathPattern } from '@/riotclient/messaging/path/PathPattern';
import { AnyPathPattern } from '@/riotclient/messaging/path/PatternParser';

type InferState<M> = M extends GenericDataManager<infer T, any> ? T : never;

type InferView<M> = M extends GenericDataManager<any, infer E> ? E : never;

export const _DISCONNECT_HANDLER = Symbol('DISCONNECT_HANDLER');
export const _CONNECT_HANDLER = Symbol('CONNECT_HANDLER');

export abstract class RCUDataAdapter<M extends GenericDataManager<any, any>> {
    protected readonly logger = new Logger(this.constructor.name);
    protected readonly rcuStateSubscription: Subscription;
    protected readonly messagingSubscription: Subscription;

    protected constructor(
        protected readonly rcService: RiotClientService,
        protected readonly manager: M,
        protected readonly stateDispatcher: RiotClientStateDispatcher,
        protected readonly messageDispatcher: TrieRCUMessageDispatcher,
    ) {
        this.rcuStateSubscription = stateDispatcher.onRCUConnectionState().subscribe((connectState) => {
            switch (connectState) {
                case RCUConnectionState.CONNECTED: {
                    this.onConnected().catch();
                    break;
                }
                case RCUConnectionState.DISCONNECTED: {
                    this.onDisconnected().catch();
                    break;
                }
                default:
                    break;
            }
        });
        const pathPats = this.getPathParts();
        this.messagingSubscription = messageDispatcher.on(pathPats).subscribe((message) => {
            this.handleRCUEvent(message).catch((err) => {});
        })
    }

    protected abstract getPathParts(): AnyPathPattern[]

    protected abstract handleRCUEvent(
        message: ForwardedMessage
    ): Promise<void>;

    protected setState(data: InferState<M> | null) {
        this.manager[_INTERNALS_WRITE_STATE](data);
    }

    protected getState(): InferState<M> {
        return this.manager[_INTERNALS_READ_STATE]();
    }

    protected async handleConnected(): Promise<void> {
    }

    protected async handleDisconnected(): Promise<void> {
    }

    private async onConnected() {
        this.handleConnected();
    }

    private async onDisconnected() {
        await this.handleDisconnected();
        await this.manager[_INTERNALS_RESET_STATE]();
    }

    public [_DISCONNECT_HANDLER](): Promise<void> {
        return this.onDisconnected();
    }

    public [_CONNECT_HANDLER](): Promise<void> {
        return this.onConnected();
    }
}
