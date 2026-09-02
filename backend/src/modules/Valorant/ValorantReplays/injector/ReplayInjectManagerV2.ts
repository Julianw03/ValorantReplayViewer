import { ConflictException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SimpleEventBus } from '@/core/events/SimpleEventBus';
import { EventType } from '@/core/events/EventTypes';
import { StateUpdatedEvent } from '@/core/events/BasicEvent';
import { ValorantGameLoopManager } from '@/modules/Valorant/ValorantGameLoopModule/ValorantGameLoopManager';
import { ReplayIOManager } from '@/modules/Valorant/ValorantReplays/storage/ReplayIOManager';
import { MatchHistoryManager } from '@/modules/Valorant/MatchHistory/MatchHistoryManager';
import { IObjectDataManager } from '@/core/data/interfaces/IObjectDataManager';
import { SimpleObjectDataManager } from '@/core/data/SimpleObjectDataManager';
import { EmittingObjectDataBehavior } from '@/core/data/behaviors/emission/EmittingObjectDataBehavior';
import { OuputMappingRecomputingObjectBehavior } from '@/core/data/behaviors/viewMapping/OuputMappingRecomputingObjectBehavior';
import { DataViewable } from '@/core/data/interfaces/capabilities/DataViewable';
import { StateMachine } from '@/core/logic/StateMachine';
import {
    InjectState,
    InjectStatus,
    ReplayDeps,
    ReplayEvent,
    ReplayEvents,
    ReplayState,
    ReplayStates,
} from '@/modules/Valorant/ValorantReplays/injector/states/ReplayStates';

@Injectable()
export class ReplayInjectManagerV2
    implements DataViewable<InjectStatus>, OnModuleInit, OnModuleDestroy {
    protected readonly logger = new Logger(this.constructor.name);

    private readonly machine: StateMachine<ReplayState, ReplayEvent, ReplayDeps>;

    private readonly status: IObjectDataManager<ReplayState, InjectStatus>;

    private unsubscribeFromSession: (() => void) | null = null;

    constructor(
        private readonly ioManager: ReplayIOManager,
        private readonly matchHistory: MatchHistoryManager,
        protected readonly eventBus: SimpleEventBus,
    ) {
        const base = new SimpleObjectDataManager<ReplayState>();

        const projecting = new OuputMappingRecomputingObjectBehavior<ReplayState, ReplayState, InjectStatus>(
            base,
            (state) => state.describe(),
        );

        this.status = new EmittingObjectDataBehavior(
            projecting,
            eventBus,
            this.constructor.name,
        );

        const deps: ReplayDeps = {
            io: ioManager,
            logger: this.logger,
        };

        this.machine = new StateMachine<ReplayState, ReplayEvent, ReplayDeps>(
            ReplayStates.Idle,
            deps,
            this.status,
            (state, error) => {
                this.logger.error(`onEnter failed in ${state.constructor.name}`, error);
                this.machine.updateValue(
                    new ReplayEvents.Failed(state.constructor.name, error),
                );
            },
        );
    }

    onModuleInit(): void {
        this.unsubscribeFromSession =
            this.eventBus.subscribeOnSource<EventType.StateUpdated>(
                ValorantGameLoopManager.name,
                (event: StateUpdatedEvent<string>) => {
                    if (event.payload.value === 'REPLAY') {
                        this.machine.updateValue(new ReplayEvents.ReplayEntered());
                    } else if (event.payload.value === 'MENUS') {
                        this.machine.updateValue(new ReplayEvents.MenusEntered());
                    }
                },
            );
    }

    onModuleDestroy(): void {
        this.unsubscribeFromSession?.();
        this.unsubscribeFromSession = null;
    }

    async startInject(matchId: string): Promise<void> {
        if (this.status.getView()?.state !== InjectState.IDLE) {
            throw new ConflictException('An inject process is already running');
        }

        const metadata = await this.ioManager.loadSavedMetadata(matchId);
        if (!metadata.isSuccess()) {
            throw new ConflictException(`Failed to load metadata for match ${matchId}`);
        }

        if (metadata.data?.replayFileMetadata == null) {
            throw new ConflictException(`Match ${matchId} has no replay file.`);
        }

        const placeholderMatchId = await this.resolvePlaceholder();

        this.machine.updateValue(
            new ReplayEvents.InjectRequested(matchId, placeholderMatchId),
        );

        this.logger.log(
            `Inject for ${matchId} started — open ${placeholderMatchId} in VALORANT to trigger`,
        );
    }

    cancelInject(): void {
        this.machine.updateValue(ReplayEvents.Canceled);
    }

    getView(): InjectStatus | null {
        return this.status.getView();
    }

    private async resolvePlaceholder(): Promise<string> {
        const history = await this.matchHistory.getMatchDataAfter(null, 20);
        const matches = Object.values(history);

        const validPlaceholder = matches.find(
            (entry) => entry?.matchMetadata?.matchInfo?.isReplayRecorded ?? false,
        );

        if (!validPlaceholder) {
            throw new ConflictException(
                'No valid placeholder match found in recent history',
            );
        }

        return validPlaceholder.matchMetadata.matchInfo.matchId;
    }
}