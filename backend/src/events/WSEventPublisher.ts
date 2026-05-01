import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Server } from 'ws';
import { SimpleEventBus } from '@/events/SimpleEventBus';
import { AccountNameAndTagLineManager } from '@/caching/AccountNameAndTagLineModule/AccountNameAndTagLineManager';
import { ValorantGameLoopManager } from '@/caching/ValorantGameLoop/ValorantGameLoopManager';
import { ValorantGameSessionManager } from '@/caching/ValorantGameSessionModule/ValorantGameSessionManager';
import { ValorantMatchStatsManager } from '@/caching/ValorantMatchStatsModule/ValorantMatchStatsManager';
import { ReplayInjectManager } from '@/plugins/replay/injector/ReplayInjectManager';
import { ValorantVersionInfoManager } from '@/caching/ValorantVersionInfo/ValorantVersionInfoManager';
import { ProductSessionManager } from '@/caching/ProductSessionManager/ProductSessionManager';
import { ReplayIOManagerV2 } from '@/plugins/replay/storage/ReplayIOManagerV2';

@WebSocketGateway({})
@Injectable()
export class WSEventPublisher
    implements
        OnModuleInit,
        OnModuleDestroy,
        OnGatewayConnection,
        OnGatewayDisconnect
{
    @WebSocketServer()
    server!: Server;

    constructor(private readonly bus: SimpleEventBus) {}

    //TODO: Make this dynamic
    private static readonly ALLOWED_SOURCES = new Set([
        AccountNameAndTagLineManager.name,
        ValorantGameLoopManager.name,
        ValorantGameSessionManager.name,
        ValorantMatchStatsManager.name,
        ReplayInjectManager.name,
        ValorantVersionInfoManager.name,
        ProductSessionManager.name,
        ReplayIOManagerV2.name
    ]);

    private unsubscribeAll: (() => void) | null = null;

    handleConnection(client: any, ...args: any[]): any {}

    handleDisconnect(client: any): any {}

    onModuleDestroy(): any {
        this.unsubscribeAll?.();
    }

    onModuleInit(): any {
        this.unsubscribeAll = this.bus.subscribeOnAll((event) => {
            if (
                !event.source ||
                !WSEventPublisher.ALLOWED_SOURCES.has(event.source)
            ) {
                return;
            }

            const payload = JSON.stringify({ type: 'event', data: event });

            this.server.clients.forEach((client) => {
                if (client.readyState === client.OPEN) {
                    client.send(payload);
                }
            });
        });
    }
}
