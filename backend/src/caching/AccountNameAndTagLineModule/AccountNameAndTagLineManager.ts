import { PlayerAccountGameNameAndTagLine } from '../../../gen';
import { Injectable } from '@nestjs/common';
import { SimpleEventBus } from '@/events/SimpleEventBus';
import { PlayerAliasDTO } from '@/caching/AccountNameAndTagLineModule/PlayerAliasDTO';
import { IObjectDataManager } from '@/caching/base/interfaces/IObjectDataManager';
import { SimpleObjectDataManager } from '@/caching/base/SimpleObjectDataManager';
import {
    RecomputingObjectMappingBehavior,
} from '@/caching/base/behaviors/viewMapping/RecomputingObjectMappingBehavior';
import { EmittingObjectDataBehavior } from '@/caching/base/behaviors/emission/EmittingObjectDataBehavior';

@Injectable()
export class AccountNameAndTagLineManager implements IObjectDataManager<
    PlayerAccountGameNameAndTagLine,
    PlayerAliasDTO
> {
    protected readonly manager: IObjectDataManager<PlayerAccountGameNameAndTagLine, PlayerAliasDTO>;

    constructor(protected readonly eventBus: SimpleEventBus) {
        const base = new SimpleObjectDataManager();
        const map = new RecomputingObjectMappingBehavior(base, AccountNameAndTagLineManager.map);
        this.manager = new EmittingObjectDataBehavior(map, eventBus, this.constructor.name);
    }

    deleteState(): void {
        this.manager.deleteState();
    }

    getView(): PlayerAliasDTO | null {
        return this.manager.getView();
    }

    updateValue(value: PlayerAccountGameNameAndTagLine): void {
        this.manager.updateValue(value);
    }

    protected static map(
        state: PlayerAccountGameNameAndTagLine,
    ): PlayerAliasDTO {
        return {
            tagLine: state.tagLine!,
            gameName: state.gameName!,
        };
    }
}
