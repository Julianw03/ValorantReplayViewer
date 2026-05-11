import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { EntitlementTokenManager } from '@/modules/EntitlementTokenModule/EntitlementTokenManager';
import { RCUMessageType } from '@/core/riotclient/messaging/RCUMessage';
import { EntitlementsToken, PluginEntitlementsApi } from '../../../gen';
import { type RiotClientService } from '@/core/riotclient/RiotClientService';
import { RIOT_CLIENT_SERVICE, RIOT_CLIENT_STATE_DISPATCHING_SERVICE } from '@/core/riotclient/RiotClientTokens';
import { AnyPathPattern, parsePatternString } from '@/core/riotclient/messaging/path/PatternParser';
import type { RiotClientStateDispatcher } from '@/core/riotclient/RiotClientStateDispatcher';
import { TrieRCUMessageDispatcher } from '@/core/riotclient/messaging/trie/TrieRCUMessageDispatcher';
import { RCUDataAdapter } from '@/core/data/adapters/RCUDataAdapter';

@Injectable()
export class EntitlementTokenRCUAdapter extends RCUDataAdapter<EntitlementTokenManager> {
    private static PATH_PATTERNS = parsePatternString('/entitlements/v1/token');

    constructor(
        @Inject(RIOT_CLIENT_SERVICE)
        rcService: RiotClientService,
        manager: EntitlementTokenManager,
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
        switch (type) {
            case RCUMessageType.CREATE:
            case RCUMessageType.UPDATE: {
                const typedData = data as unknown as EntitlementsToken;
                this.logger.log('Updating entitlement token');
                this.manager.updateValue(typedData);
                break;
            }
            case RCUMessageType.DELETE: {
                this.logger.log('Deleting entitlement token');
                this.manager.deleteState();
                break;
            }
            default:
                throw new Error(`Unsupported message type: ${type}`);
        }
    }

    protected async handleConnected() {
        const api = this.rcService.getCachedApi(PluginEntitlementsApi);
        const resp = await api.entitlementsV1TokenGet().catch((e) => {
            this.logger.warn(
                'Failed to fetch entitlement token',
                e.response?.data || e,
            );
            return null;
        });
        if (!resp || resp.status !== HttpStatus.OK) return;
        if (this.manager.getView() === null) {
            this.logger.log(
                'Setting initial entitlement token state',
            );
            this.manager.updateValue(resp.data);
        }
    }

    protected getPathParts(): AnyPathPattern[] {
        return EntitlementTokenRCUAdapter.PATH_PATTERNS;
    }
}
