import { Injectable } from '@nestjs/common';
import { SimpleEventBus } from '@/core/events/SimpleEventBus';
import { IObjectDataManager } from '@/core/data/interfaces/IObjectDataManager';
import { SimpleObjectDataManager } from '@/core/data/SimpleObjectDataManager';
import {
    RecomputingObjectMappingBehavior,
} from '@/core/data/behaviors/viewMapping/RecomputingObjectMappingBehavior';
import { EmittingObjectDataBehavior } from '@/core/data/behaviors/emission/EmittingObjectDataBehavior';

export interface AresSessionPayload {
    subject: string;
    loopState: string;
    loopStateMetadata: string;
    cxnState: string;
    clientVersion: string;
    version: number;
}

@Injectable()
export class ValorantGameLoopManager implements IObjectDataManager<
    string,
    string
> {
    private readonly manager: IObjectDataManager<
        string,
        string
    >;

    constructor(protected readonly eventBus: SimpleEventBus) {
        const base = new SimpleObjectDataManager<string>();
        const map = new RecomputingObjectMappingBehavior(base, ValorantGameLoopManager.map);
        this.manager = new EmittingObjectDataBehavior(map, eventBus, this.constructor.name);
    }

    protected static map(state: string): string {
        return state ?? null;
    }

    deleteState(): void {
        this.manager.deleteState();
    }

    getView(): string | null {
        return this.manager.getView();
    }

    updateValue(value: string): void {
        this.manager.updateValue(value);
    }
}
