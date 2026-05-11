import { Module } from '@nestjs/common';
import { ShutdownManager } from '@/modules/ShutdownModule/ShutdownManager';
import { ShutdownController } from '@/modules/ShutdownModule/ShutdownController';

@Module({
    providers: [ShutdownManager, ShutdownController],
    controllers: [ShutdownController],
})
export class ShutdownModule {
}