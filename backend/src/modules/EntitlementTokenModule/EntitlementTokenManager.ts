import { EntitlementsToken } from '../../../gen';
import { Injectable } from '@nestjs/common';
import { EntitlementTokenDTO } from '@/modules/EntitlementTokenModule/EntitlementTokenDTO';
import { IObjectDataManager } from '@/core/data/interfaces/IObjectDataManager';
import { SimpleObjectDataManager } from '@/core/data/SimpleObjectDataManager';
import {
    RecomputingObjectMappingBehavior,
} from '@/core/data/behaviors/viewMapping/RecomputingObjectMappingBehavior';

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
