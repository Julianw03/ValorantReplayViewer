import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { SimpleEventBus } from '@/core/events/SimpleEventBus';
import { IObjectDataManager } from '@/core/data/interfaces/IObjectDataManager';
import { SimpleObjectDataManager } from '@/core/data/SimpleObjectDataManager';
import { RecomputingObjectMappingBehavior } from '@/core/data/behaviors/viewMapping/RecomputingObjectMappingBehavior';
import { EmittingObjectDataBehavior } from '@/core/data/behaviors/emission/EmittingObjectDataBehavior';
import { RiotValorantAPIManager } from '@/integrations/riot/RiotValorantAPIManager';

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
>, OnModuleDestroy {
    private readonly logger = new Logger(this.constructor.name);
    private readonly manager: IObjectDataManager<
        string,
        string
    >;

    private readonly unsubscribe: undefined | (() => void) = undefined;

    constructor(
        protected readonly eventBus: SimpleEventBus,
        protected readonly valApi: RiotValorantAPIManager,
    ) {
        const base = new SimpleObjectDataManager<string>();
        const map = new RecomputingObjectMappingBehavior(base, ValorantGameLoopManager.map);
        this.manager = new EmittingObjectDataBehavior(map, eventBus, this.constructor.name);
        this.unsubscribe = RiotValorantAPIManager.onValorantAPIReady(eventBus, this.onValorantAPIReady.bind(this));
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

    private async onValorantAPIReady(): Promise<void> {
        try {
            const state = await this.valApi.getGameLoopState();
            this.updateValue(state.loopState);
        } catch (err) {
            this.logger.warn('Failed to get game loop state', err);
        }
    }

    onModuleDestroy(): any {
        this.unsubscribe?.();
    }
}
