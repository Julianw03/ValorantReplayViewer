import {
    CanActivate,
    ExecutionContext,
    Inject,
    Injectable,
    ServiceUnavailableException,
    SetMetadata,
} from '@nestjs/common';
import type { RiotClientService } from '@/core/riotclient/RiotClientService';
import { RIOT_CLIENT_SERVICE } from '@/core/riotclient/RiotClientTokens';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';

export const SKIP_RIOT_CLIENT_READY_GUARD = 'skipRiotClientReadyGuard';
export const SkipRiotClientReadyGuard = () =>
    SetMetadata(SKIP_RIOT_CLIENT_READY_GUARD, true);

@Injectable()
export class RiotClientReadyGuard implements CanActivate {
    constructor(
        @Inject(RIOT_CLIENT_SERVICE)
        protected readonly rcService: RiotClientService,
        private readonly reflector: Reflector,
    ) {}

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const doSkip = this.reflector.getAllAndOverride<boolean>(
            SKIP_RIOT_CLIENT_READY_GUARD,
            [context.getHandler(), context.getClass()],
        );

        if (doSkip) {
            return true;
        }

        if (!this.rcService.isConnected()) {
            throw new ServiceUnavailableException(
                'Application is not connected to the Riot Client.',
            );
        }
        return true;
    }
}
