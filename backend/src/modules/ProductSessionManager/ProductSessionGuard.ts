import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, SetMetadata } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { ProductSessionManager } from '@/modules/ProductSessionManager/ProductSessionManager';

export const SKIP_SESSIONS_EXISTS_GUARD = 'skipSessionExistsGuard';
export const SkipRiotClientReadyGuard = () =>
    SetMetadata(SKIP_SESSIONS_EXISTS_GUARD, true);

export const REQUIRED_PRODUCT_ID = 'requiredProductId';
export const RequiredProduct = (productId: string) =>
    SetMetadata(REQUIRED_PRODUCT_ID, productId);

@Injectable()
export class ProductSessionGuard implements CanActivate {
    constructor(
        protected readonly productSessionManager: ProductSessionManager,
        private readonly reflector: Reflector,
    ) {
    }

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const doSkip = this.reflector.getAllAndOverride<boolean>(
            SKIP_SESSIONS_EXISTS_GUARD,
            [context.getHandler(), context.getClass()],
        );

        const requiredProductId = this.reflector.getAllAndOverride<string>(
            REQUIRED_PRODUCT_ID,
            [context.getHandler(), context.getClass()],
        );

        if (doSkip) {
            return true;
        }

        const session = this.productSessionManager.getSessionByProductId(requiredProductId);
        if (!session) {
            throw new ServiceUnavailableException(`Product ${requiredProductId} session is not available`);
        }

        return true;
    }
}
