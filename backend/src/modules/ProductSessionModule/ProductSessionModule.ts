import { ProductSessionManager } from './ProductSessionManager';
import { Module } from '@nestjs/common';
import { RiotClientModule } from '@/core/riotclient/RiotClientModule';
import { ProductSessionRCUAdapter } from '@/modules/ProductSessionModule/ProductSessionRCUAdapter';
import { ProductSessionGuard } from '@/modules/ProductSessionModule/ProductSessionGuard';
import { EventBusModule } from '@/core/events/EventBusModule';
import { ProductSessionController } from '@/modules/ProductSessionModule/ProductSessionController';

@Module({
    imports: [RiotClientModule, EventBusModule],
    providers: [ProductSessionManager, ProductSessionRCUAdapter, ProductSessionGuard],
    controllers: [ProductSessionController],
    exports: [ProductSessionManager, ProductSessionGuard],
})
export class ProductSessionModule {}
