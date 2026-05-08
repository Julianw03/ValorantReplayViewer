import { EntitlementsToken } from '../../../gen';
import { Injectable } from '@nestjs/common';
import { EntitlementTokenDTO } from '@/caching/EntitlementTokenModule/EntitlementTokenDTO';
import { IObjectDataManager } from '@/caching/base/interfaces/IObjectDataManager';
import { SimpleObjectDataManager } from '@/caching/base/SimpleObjectDataManager';
import {
    RecomputingObjectMappingBehavior,
} from '@/caching/base/behaviors/viewMapping/RecomputingObjectMappingBehavior';

@Injectable()
export class EntitlementTokenManager implements IObjectDataManager<
    EntitlementsToken,
    EntitlementTokenDTO
> {
    private readonly manager: IObjectDataManager<
        EntitlementsToken,
        EntitlementTokenDTO
    >;

    constructor() {
        const store = new SimpleObjectDataManager<EntitlementsToken>();
        this.manager = new RecomputingObjectMappingBehavior(store, EntitlementTokenManager.map);
    }

    private static map(state: EntitlementsToken): EntitlementTokenDTO {
        return {
            accessToken: state.accessToken!,
            entitlements: [...state.entitlements!],
            issuer: state.issuer!,
            subject: state.subject!,
            token: state.token!,
        };
    }

    deleteState(): void {
        this.manager.deleteState();
    }

    getView(): EntitlementTokenDTO | null {
        return this.manager.getView();
    }

    updateValue(value: EntitlementsToken): void {
        this.manager.updateValue(value);
    }
}
