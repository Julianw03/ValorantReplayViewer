import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RCUMapDataAdapter } from '@/riotclient/adapters/RCUMapDataAdapter';
import { ProductSessionManager } from '@/caching/ProductSessionManager/ProductSessionManager';
import { RCUMessageType } from '@/riotclient/messaging/RCUMessage';
import { PluginProductSessionApi, ProductSessionSession } from '../../../gen';
import type { RiotClientService } from '@/riotclient/RiotClientService';
import { RIOT_CLIENT_SERVICE, RIOT_CLIENT_STATE_DISPATCHING_SERVICE } from '@/riotclient/RiotClientTokens';
import type { RiotClientStateDispatcher } from '@/riotclient/RiotClientStateDispatcher';
import { TrieRCUMessageDispatcher } from '@/riotclient/messaging/trie/TrieRCUMessageDispatcher';
import { AnyPathPattern, parsePatternString } from '@/riotclient/messaging/path/PatternParser';

@Injectable()
export class ProductSessionRCUAdapter extends RCUMapDataAdapter<ProductSessionManager> {

    private static PATH_PATTERNS = parsePatternString('/product-session/v1/sessions/{sessionId}');

    constructor(
        @Inject(RIOT_CLIENT_SERVICE)
        rcService: RiotClientService,
        manager: ProductSessionManager,
        @Inject(RIOT_CLIENT_STATE_DISPATCHING_SERVICE)
        stateDispatcher: RiotClientStateDispatcher,
        messageDispatcher: TrieRCUMessageDispatcher,
    ) {
        super(rcService, manager, stateDispatcher, messageDispatcher);
    }

    protected async handleRCUEvent(
        forward,
    ): Promise<void> {
        const type = forward.message.type;
        const data = forward.message.data;
        const match = forward.matchResult.params;
        switch (type) {
            case RCUMessageType.CREATE:
            case RCUMessageType.UPDATE: {
                this.logger.log(match);
                const typedData = data as unknown as ProductSessionSession;
                const sessionId = match['sessionId'];
                if (this.getEntry(sessionId) === null) {
                    this.logger.log(
                        `Registering new product session with ID: ${sessionId}`,
                        typedData,
                    );
                }
                this.setKeyValue(sessionId, typedData);
                break;
            }
            case RCUMessageType.DELETE: {
                const sessionId = match['sessionId'];
                this.logger.log(
                    `Unregistering product session with ID: ${sessionId}`,
                );
                this.deleteKey(sessionId);
                break;
            }
            default:
                throw new Error(`Unsupported message type: ${type}`);
        }
    }

    protected async handleConnected(): Promise<void> {
        const api = this.rcService.getCachedApi(PluginProductSessionApi);
        const resp = await api.productSessionV1SessionsGet();
        if (!resp || resp.status !== HttpStatus.OK) {
            this.logger.warn(
                'Failed to fetch initial product session data on RCU connection',
                resp?.status,
            );
            return;
        }

        const data = resp.data;
        const currentState = this.getState();
        const newState = new Map([
            ...currentState,
            ...Object.entries(data),
        ]);
        this.logger.log(newState);

        this.setState(newState);
    }

    protected getPathParts(): AnyPathPattern[] {
        return ProductSessionRCUAdapter.PATH_PATTERNS;
    }
}
