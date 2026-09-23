import { Module } from '@nestjs/common';
import { PathProviderService } from '@/modules/PathProvider/PathProviderService';

@Module({
    imports: [],
    providers: [PathProviderService],
    exports: [PathProviderService]
})
export class PathProviderModule {}