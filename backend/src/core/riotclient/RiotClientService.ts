import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Configuration } from '../../../gen';
import { BaseAPI } from '../../../gen/base';

export interface RiotClientService extends OnModuleInit,
    OnModuleDestroy {
    connect(): Promise<void>;

    disconnect(): Promise<void>;

    getConfiguration(): Configuration | null;

    getCachedApi<T extends BaseAPI>(
        ApiClass: new (config: Configuration) => T,
    ): T;

    isConnected(): boolean;
}
