import { Inject, Injectable } from '@nestjs/common';
import { RCUDataAdapter } from '@/riotclient/adapters/RCUDataAdapter';
import { RCUMessageType } from '@/riotclient/messaging/RCUMessage';
import { RIOT_CLIENT_SERVICE } from '@/riotclient/RiotClientTokens';
import { type RiotClientService } from '@/riotclient/RiotClientService';
import { AresSessionPayload, ValorantGameLoopManager } from '@/caching/ValorantGameLoop/ValorantGameLoopManager';
import { RiotValorantAPI } from '@/api/riot/RiotValorantAPI';

interface RmsEnvelope {
    ackRequired: boolean;
    id: string;
    payload: string;
    resource: string;
    service: string;
    timestamp: number;
    version: string;
}

@Injectable()
export class ValorantGameLoopRCUAdapter
    extends RCUDataAdapter<ValorantGameLoopManager> {
    private static readonly ENDPOINT_REGEX =
        /^\/riot-messaging-service\/v1\/message\/ares-session\/v1\/sessions\/.+$/;

    constructor(
        @Inject(RIOT_CLIENT_SERVICE)
        protected readonly rcService: RiotClientService,
        protected readonly manager: ValorantGameLoopManager,
        protected readonly valApi: RiotValorantAPI,
    ) {
        super(rcService, manager);
    }

    protected getEndpointRegex(): RegExp {
        return ValorantGameLoopRCUAdapter.ENDPOINT_REGEX;
    }

    protected async handleRCUEvent(
        type: RCUMessageType,
        match: RegExpExecArray,
        data: JsonNode,
    ): Promise<void> {
        switch (type) {
            case RCUMessageType.UPDATE:
            case RCUMessageType.CREATE:
                break;
            case RCUMessageType.DELETE:
            default:
                return;
        }
        const envelope = data as unknown as RmsEnvelope;

        let payload: AresSessionPayload = JSON.parse(
            envelope.payload,
        ) as unknown as AresSessionPayload;

        this.setState(payload.loopState);
    }

    private async fetchAndSetGameLoop(): Promise<void> {
        try {
            const data = await this.valApi.getGameLoopState();
            this.setState(data.loopState);
        } catch (error) {
            this.logger.warn('Failed to fetch game loop state', error);
        }
    }

    async handleDisconnected(): Promise<void> {

    }
}
