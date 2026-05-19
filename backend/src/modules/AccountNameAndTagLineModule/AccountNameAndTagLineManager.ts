import { PlayerAccountGameNameAndTagLine } from '../../../gen';
import { Injectable } from '@nestjs/common';
import { SimpleEventBus } from '@/core/events/SimpleEventBus';
import { PlayerAlias } from '@/modules/AccountNameAndTagLineModule/PlayerAlias';
import { IObjectDataManager } from '@/core/data/interfaces/IObjectDataManager';
import { SimpleObjectDataManager } from '@/core/data/SimpleObjectDataManager';
import {
    RecomputingObjectMappingBehavior,
} from '@/core/data/behaviors/viewMapping/RecomputingObjectMappingBehavior';
import { EmittingObjectDataBehavior } from '@/core/data/behaviors/emission/EmittingObjectDataBehavior';

@Injectable()
export class AccountNameAndTagLineManager implements IObjectDataManager<
    PlayerAccountGameNameAndTagLine,
    PlayerAlias
> {
    protected readonly manager: IObjectDataManager<PlayerAccountGameNameAndTagLine, PlayerAlias>;

    constructor(protected readonly eventBus: SimpleEventBus) {
        const base = new SimpleObjectDataManager();
        const map = new RecomputingObjectMappingBehavior(base, AccountNameAndTagLineManager.map);
        this.manager = new EmittingObjectDataBehavior(map, eventBus, this.constructor.name);
    }

    deleteState(): void {
        this.manager.deleteState();
    }

    getView(): PlayerAlias | null {
        return this.manager.getView();
    }

    updateValue(value: PlayerAccountGameNameAndTagLine): void {
        this.manager.updateValue(value);
    }

    protected static map(
        state: PlayerAccountGameNameAndTagLine,
    ): PlayerAlias {
        return {
            tagLine: state.tagLine!,
            gameName: state.gameName!,
        };
    }
}
