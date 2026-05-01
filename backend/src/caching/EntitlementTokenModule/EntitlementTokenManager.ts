import { ObjectDataManager } from '../base/ObjectDataManager';
import { EntitlementsToken, PluginEntitlementsApi } from '../../../gen';
import { RCUMessageType } from '@/riotclient/messaging/RCUMessage';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { RiotClientService } from '@/riotclient/RiotClientService';
import { EntitlementTokenDTO } from '@/caching/EntitlementTokenModule/EntitlementTokenDTO';

@Injectable()
export class EntitlementTokenManager extends ObjectDataManager<
    EntitlementsToken,
    EntitlementTokenDTO
> {
    protected getViewFor(
        state: EntitlementsToken | null,
    ): EntitlementTokenDTO | null {
        if (state === null) return null;
        return {
            accessToken: state.accessToken!,
            entitlements: [...state.entitlements!],
            issuer: state.issuer!,
            subject: state.subject!,
            token: state.token!,
        };
    }

    constructor() {
        super();
    }

    protected async resetInternalState(): Promise<void> {
        this.setState(null);
    }
}
