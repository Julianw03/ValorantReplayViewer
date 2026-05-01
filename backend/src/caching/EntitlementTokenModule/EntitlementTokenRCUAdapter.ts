import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RCUDataAdapter } from '@/riotclient/adapters/RCUDataAdapter';
import { EntitlementTokenManager } from '@/caching/EntitlementTokenModule/EntitlementTokenManager';
import { RCUMessageType } from '@/riotclient/messaging/RCUMessage';
import { EntitlementsToken, PluginEntitlementsApi } from '../../../gen';
import { type RiotClientService } from '@/riotclient/RiotClientService';
import { RIOT_CLIENT_SERVICE } from '@/riotclient/RiotClientTokens';

@Injectable()
export class EntitlementTokenRCUAdapter extends RCUDataAdapter<EntitlementTokenManager> {
    private static readonly REGEX = new RegExp(
        '^/entitlements/v1/token$',
        'gm',
    );

    constructor(
        @Inject(RIOT_CLIENT_SERVICE)
        protected readonly rcService: RiotClientService,
        protected readonly entitlementTokenManager: EntitlementTokenManager,
    ) {
        super(rcService, entitlementTokenManager);
    }

    protected getEndpointRegex(): RegExp {
        return EntitlementTokenRCUAdapter.REGEX;
    }

    protected async handleRCUEvent(
        type: RCUMessageType,
        _: RegExpExecArray,
        data: JsonNode,
    ): Promise<void> {
        switch (type) {
            case RCUMessageType.CREATE:
            case RCUMessageType.UPDATE: {
                const typedData = data as unknown as EntitlementsToken;
                this.logger.log('Updating entitlement token');
                this.setState(typedData);
                break;
            }
            case RCUMessageType.DELETE: {
                this.logger.log('Deleting entitlement token');
                this.setState(null);
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
        if (this.getState() === null) {
            this.logger.log(
                'Setting initial entitlement token state'
            );
            this.setState(resp.data);
        }
    }
}
