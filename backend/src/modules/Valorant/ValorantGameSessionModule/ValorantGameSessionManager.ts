import { SimpleUUID } from '@/modules/Valorant/ValorantMatchStatsModule/RiotMatchApiResponseDTO';
import { Injectable, Logger } from '@nestjs/common';
import { SimpleEventBus } from '@/core/events/SimpleEventBus';
import { MatchStatus } from '@/modules/Valorant/ValorantGameSessionModule/MatchStatus';
import { IMapDataManager } from '@/core/data/interfaces/IMapDataManager';
import { EmittingMapDataBehavior } from '@/core/data/behaviors/emission/EmittingMapDataBehavior';
import { SimpleMapDataManager } from '@/core/data/SimpleMapDataManager';
import { KeyDataUpdatable } from '@/core/data/interfaces/capabilities/KeyDataUpdatable';
import { DataDeletable } from '@/core/data/interfaces/capabilities/DataDeletable';
import { KeyDataViewable } from '@/core/data/interfaces/capabilities/KeyDataViewable';

@Injectable()
export class ValorantGameSessionManager implements KeyDataUpdatable<SimpleUUID, MatchStatus>, DataDeletable, KeyDataViewable<SimpleUUID, MatchStatus> {
    private readonly manager: IMapDataManager<
        SimpleUUID,
        MatchStatus,
        MatchStatus
    >;
    private readonly logger = new Logger(this.constructor.name);

    constructor(protected readonly eventBus: SimpleEventBus) {
        const base = new SimpleMapDataManager<SimpleUUID, MatchStatus>();
        this.manager = new EmittingMapDataBehavior(base, eventBus, this.constructor.name);
    }

    private latestMatchId: SimpleUUID | null = null;

    private static ValidTransitionStates: Record<MatchStatus, MatchStatus[]> = {
        [MatchStatus.CHAMPION_SELECTION]: [
            MatchStatus.IN_PROGRESS,
            MatchStatus.ASSUMED_CANCELLED,
        ],
        [MatchStatus.IN_PROGRESS]: [MatchStatus.ENDED],
        [MatchStatus.ENDED]: [],
        // An example would be quitting a deathmatch game, while its in progress,
        // We could start another game right after, but the game would later on end
        // so we need to allow this transition
        [MatchStatus.ASSUMED_CANCELLED]: [MatchStatus.ENDED],
    };

    private verifyTransition(
        oldStatus: MatchStatus | null,
        newStatus: MatchStatus,
    ): boolean {
        if (oldStatus === null) {
            return true;
        }

        const validTransitions =
            ValorantGameSessionManager.ValidTransitionStates[oldStatus] || [];
        return validTransitions.includes(newStatus);
    }

    protected getViewForValue(value: MatchStatus | null): MatchStatus | null {
        return value;
    }

    deleteState(): void {
        this.manager.deleteState();
    }

    getKeyView(key: SimpleUUID): MatchStatus | null {
        return this.manager.getKeyView(key);
    }

    getView(): Record<SimpleUUID, MatchStatus> | null {
        return this.manager.getView();
    }

    updateKeyValue(key: SimpleUUID, value: MatchStatus): void {
        const prev = this.getKeyView(key);
        if (!this.verifyTransition(prev, value)) return;
        const prevMatchId = this.latestMatchId;
        if (prev === null) {
            this.latestMatchId = key;
            if (prevMatchId !== null) {
                this.logger.log(
                    `Got a new match id ${key} that will replace ${prevMatchId} -> Attempting to transition it to ${MatchStatus.ASSUMED_CANCELLED}`,
                );
                this.updateKeyValue(prevMatchId, MatchStatus.ASSUMED_CANCELLED);
            }
        }
        this.manager.updateKeyValue(key, value);
    }


}
