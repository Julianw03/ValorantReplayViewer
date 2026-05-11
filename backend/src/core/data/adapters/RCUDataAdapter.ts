import { Logger } from '@nestjs/common';
import { Subscription } from 'rxjs';
import { ForwardedMessage, TrieRCUMessageDispatcher } from '@/core/riotclient/messaging/trie/TrieRCUMessageDispatcher';
import { RCUConnectionState } from '@/core/riotclient/connection/RCUConnectionState';
import { RiotClientService } from '@/core/riotclient/RiotClientService';
import { RiotClientStateDispatcher } from '@/core/riotclient/RiotClientStateDispatcher';
import { AnyPathPattern } from '@/core/riotclient/messaging/path/PatternParser';
import { DataDeletable } from '@/core/data/interfaces/capabilities/DataDeletable';

export abstract class RCUDataAdapter<M extends DataDeletable> {
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
            this.handleRCUEvent(message).catch((err) => {
            });
        });
    }

    protected abstract getPathParts(): AnyPathPattern[]

    protected abstract handleRCUEvent(
        message: ForwardedMessage,
    ): Promise<void>;

    protected async handleConnected(): Promise<void> {
    }

    protected async handleDisconnected(): Promise<void> {
    }

    private async onConnected() {
        this.handleConnected();
    }

    private async onDisconnected() {
        await this.handleDisconnected();
        this.manager.deleteState();
    }
}