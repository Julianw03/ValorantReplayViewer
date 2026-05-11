import { INestApplication, Injectable, Logger, ShutdownSignal } from '@nestjs/common';
import * as process from 'node:process';
import { sleep } from '@/utils/PromiseUtils';

@Injectable()
export class ShutdownManager {
    private readonly logger = new Logger(this.constructor.name);
    private app: INestApplication | null = null;

    constructor() {
    }

    public setApp(app: INestApplication) {
        this.app = app;
    }

    public async shutdown(): Promise<void> {
        this.logger.debug(`Shutdown requested.`);
        setTimeout(async () => {
            this.logger.log('Requesting graceful shutdown');
            this.app?.close();
            await sleep(3_000);
            this.logger.log(`Grace period over, running process kill`);
            process.kill(process.pid, ShutdownSignal.SIGTERM);
        }, 1_000);
    }
}