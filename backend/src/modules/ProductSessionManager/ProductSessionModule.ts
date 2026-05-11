import { ProductSessionManager } from './ProductSessionManager';
import { Module } from '@nestjs/common';
import { RiotClientModule } from '@/core/riotclient/RiotClientModule';
import { ProductSessionRCUAdapter } from '@/modules/ProductSessionManager/ProductSessionRCUAdapter';
import { ProductSessionGuard } from '@/modules/ProductSessionManager/ProductSessionGuard';
import { EventBusModule } from '@/core/events/EventBusModule';
import { ProductSessionController } from '@/modules/ProductSessionManager/ProductSessionController';

@Module({
    imports: [RiotClientModule, EventBusModule],
    providers: [ProductSessionManager, ProductSessionRCUAdapter, ProductSessionGuard],
    controllers: [ProductSessionController],
    exports: [ProductSessionManager, ProductSessionGuard],
})
export class ProductSessionModule {}
