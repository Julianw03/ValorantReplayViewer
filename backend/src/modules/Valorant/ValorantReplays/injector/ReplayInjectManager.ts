import { ConflictException, Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { SimpleEventBus } from '@/core/events/SimpleEventBus';
import { EventType } from '@/core/events/EventTypes';
import { StateUpdatedEvent } from '@/core/events/BasicEvent';
import { ValorantGameLoopManager } from '@/modules/Valorant/ValorantGameLoop/ValorantGameLoopManager';
import { RiotValorantAPIManager } from '@/integrations/riot/RiotValorantAPIManager';
import { ReplayIOManager } from '@/modules/Valorant/ValorantReplays/storage/ReplayIOManager';
import { IObjectDataManager } from '@/core/data/interfaces/IObjectDataManager';
import { SimpleObjectDataManager } from '@/core/data/SimpleObjectDataManager';
import { EmittingObjectDataBehavior } from '@/core/data/behaviors/emission/EmittingObjectDataBehavior';
import { DataViewable } from '@/core/data/interfaces/capabilities/DataViewable';
import e from 'express';

export enum InjectState {
    IDLE = 'IDLE',
    DOWNLOADING_PLACEHOLDER = 'DOWNLOADING_PLACEHOLDER',
    AWAITING_REPLAY_START = 'AWAITING_REPLAY_START',
    INJECTED = 'INJECTED',
    RESTORING_ORIGINAL_REPLAY = 'RESTORING_ORIGINAL_REPLAY',
    FAILED = 'FAILED',
}

export interface InjectStatus {
    state: InjectState;
    targetMatchId: string | null;
    placeholderMatchId: string | null;
}

//TODO: Instead get metadata
const VALID_QUEUE_IDS = ['competitive', 'unrated', 'spikerush', 'swiftplay'];

@Injectable()
export class ReplayInjectManager implements DataViewable<InjectStatus>, OnModuleDestroy {
    private readonly manager: IObjectDataManager<InjectStatus, InjectStatus>;
    protected readonly logger = new Logger(this.constructor.name);
    private targetMatchId: string | null = null;
    private placeholderMatchId: string | null = null;
    private unsubscribeFromSession: (() => void) | null = null;

    constructor(
        private readonly apiClient: RiotValorantAPIManager,
        private readonly ioManager: ReplayIOManager,
        protected readonly eventBus: SimpleEventBus,
    ) {
        const base = new SimpleObjectDataManager<InjectStatus>();
        this.manager = new EmittingObjectDataBehavior(base, eventBus, this.constructor.name);
        this.manager.updateValue({
            state: InjectState.IDLE,
            targetMatchId: null,
            placeholderMatchId: null,
        });
    }

    async startInject(matchId: string): Promise<void> {
        if (this.manager.getView()?.state !== InjectState.IDLE) {
            throw new ConflictException('An inject process is already running');
        }
        if (!this.ioManager.matchRegistered(matchId)) {
            throw new NotFoundException(
                `Match ${matchId} is not in persistent storage`,
            );
        }

        this.targetMatchId = matchId;

        try {
            const history = await this.apiClient.getMatchHistory(0, 10);
            if (!history.length)
                throw new Error(
                    'No recent match history available for placeholder',
                );

            const validPlaceholder = history.find((entry) =>
                VALID_QUEUE_IDS.includes(entry.QueueID.toLowerCase()),
            );

            if (!validPlaceholder) {
                throw new Error(
                    'No valid placeholder match found in recent history',
                );
            }

            this.placeholderMatchId = validPlaceholder.MatchID;
            this.manager.updateValue({
                state: InjectState.DOWNLOADING_PLACEHOLDER,
                targetMatchId: this.targetMatchId,
                placeholderMatchId: this.placeholderMatchId,
            });
            this.logger.log(
                `Using ${this.placeholderMatchId} as inject placeholder`,
            );

            if (!this.placeholderMatchId) {
                throw new Error(
                    'No valid placeholder match ID found in recent history',
                );
            }

            // Ensure the placeholder is in persistent storage, downloading only if necessary.
            await this.ioManager.triggerDownload(this.placeholderMatchId);
            await this.ioManager.moveToValorantDemos(this.placeholderMatchId);

            this.manager.updateValue({
                state: InjectState.AWAITING_REPLAY_START,
                targetMatchId: this.targetMatchId,
                placeholderMatchId: this.placeholderMatchId,
            });

            this.unsubscribeFromSession = this.eventBus.subscribeOnSource(
                ValorantGameLoopManager.name,
                (event: StateUpdatedEvent<string>) => {
                    if (event.payload.value === 'REPLAY') {
                        this.unsubscribeFromSession?.();
                        this.unsubscribeFromSession = null;
                        this.performInject().catch((e) => {
                            this.logger.error(
                                'File swap during inject failed',
                                e,
                            );
                            this.handleFail();
                        });
                    }
                },
            );

            this.logger.log(
                `Inject for ${matchId} ready — open ${this.placeholderMatchId} in VALORANT to trigger`,
            );
        } catch (e) {
            this.logger.error('Inject setup failed', e);
            this.unsubscribeFromSession?.();
            this.unsubscribeFromSession = null;
            this.handleFail();
        }
    }

    cancelInject(): void {
        this.unsubscribeFromSession?.();
        this.unsubscribeFromSession = null;
        this.resetInternalState();
        this.logger.log('Inject cancelled');
    }

    handleFail(): void {
        this.manager.updateValue({
            state: InjectState.FAILED,
            targetMatchId: this.targetMatchId,
            placeholderMatchId: this.placeholderMatchId,
        });
        this.targetMatchId = null;
        this.placeholderMatchId = null;
    }

    onModuleDestroy() {
        this.unsubscribeFromSession?.();
        this.unsubscribeFromSession = null;
    }

    private async performInject(): Promise<void> {
        if (!this.targetMatchId || !this.placeholderMatchId) return;

        await this.ioManager.injectReplayOverPlaceholder(
            this.targetMatchId,
            this.placeholderMatchId,
        );
        this.manager.updateValue({
            state: InjectState.INJECTED,
            targetMatchId: this.targetMatchId,
            placeholderMatchId: this.placeholderMatchId,
        });
        this.unsubscribeFromSession =
            this.eventBus.subscribeOnSource<EventType.StateUpdated>(
                ValorantGameLoopManager.name,
                (event: StateUpdatedEvent<string>) => {
                    if (event.payload.value === 'MENUS') {
                        this.unsubscribeFromSession?.();
                        this.unsubscribeFromSession = null;
                        this.manager.updateValue({
                            state: InjectState.RESTORING_ORIGINAL_REPLAY,
                            targetMatchId: this.targetMatchId,
                            placeholderMatchId: this.placeholderMatchId,
                        });
                        this.restoreOriginalReplayFile(this.placeholderMatchId)
                            .then(() => {
                                this.resetInternalState();
                            })
                            .catch((e) => {
                                this.logger.error(
                                    'Failed to restore original replay file after inject',
                                    e,
                                );
                                this.handleFail();
                            });
                    }
                },
            );
    }

    private async restoreOriginalReplayFile(placeholderMatchId: string | null): Promise<void> {
        if (!placeholderMatchId) return;
        await this.ioManager.restoreReplayFile(placeholderMatchId);
    }


    protected getViewFor(state: InjectStatus | null): InjectStatus | null {
        return state;
    }

    protected async resetInternalState(): Promise<void> {
        this.targetMatchId = null;
        this.placeholderMatchId = null;
        this.manager.updateValue({
            state: InjectState.IDLE,
            targetMatchId: null,
            placeholderMatchId: null,
        });
    }

    getView(): InjectStatus | null {
        return this.manager.getView();
    }
}
