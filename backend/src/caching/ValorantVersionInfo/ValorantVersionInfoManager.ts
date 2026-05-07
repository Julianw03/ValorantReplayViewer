import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SimpleEventBus } from '@/events/SimpleEventBus';
import fs from 'node:fs';
import * as readline from 'node:readline';
import { ProductSessionManager } from '@/caching/ProductSessionManager/ProductSessionManager';
import { type ConfigType } from '@nestjs/config';
import { appConfig } from '@/config/configLoader';
import { MinimalVersionInfoDTO } from '@/caching/ValorantVersionInfo/MinimalVersionInfoDTO';
import { IObjectDataManager } from '@/caching/base/interfaces/IObjectDataManager';
import { SimpleObjectDataManager } from '@/caching/base/SimpleObjectDataManager';
import { EmittingObjectDataBehavior } from '@/caching/base/behaviors/emission/EmittingObjectDataBehavior';
import path from 'path';

@Injectable()
export class ValorantVersionInfoManager implements IObjectDataManager<MinimalVersionInfoDTO, MinimalVersionInfoDTO>, OnModuleInit, OnModuleDestroy {
    protected readonly manager: IObjectDataManager<MinimalVersionInfoDTO, MinimalVersionInfoDTO>;
    protected readonly logger = new Logger(this.constructor.name);

    constructor(
        @Inject(appConfig.KEY)
        protected readonly config: ConfigType<typeof appConfig>,
        protected readonly eventBus: SimpleEventBus,
    ) {
        const base = new SimpleObjectDataManager<MinimalVersionInfoDTO>();
        this.manager = new EmittingObjectDataBehavior(base, eventBus, this.constructor.name);
        this.regex = new RegExp(this.config.configurations['valorant-version-read'].regex);
    }

    private unsubscribe: (() => void) | null = null;
    private timeoutHandle: NodeJS.Timeout | null = null;
    private maxRetryCount = 5;
    private lastSeesSessionId: string | null = null;
    private readonly regex: RegExp;

    private async loadAndSetState(retryCount = 0): Promise<void> {
        const optOverride = this.config.overrides['valorant-version-read'].version;
        if (optOverride) {
            this.manager.updateValue({
                version: optOverride,
            });
            return;
        }

        try {
            const filePath = path.join(this.config.filepaths['valorant-saved'].getResolvedPath(), 'Logs', 'ShooterGame.log');
            const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
            const rl = readline.createInterface({
                input: stream,
                crlfDelay: Infinity,
            });
            for await (const line of rl) {
                const match = this.regex.exec(line);
                if (match && match[1]) {
                    const version = match[1];
                    this.logger.log('Extracted version:', version);
                    this.manager.updateValue({
                        version: version,
                    });
                    return;
                }
            }
            throw new Error('No version info found in log file');
        } catch (error) {
            this.logger.warn('Failed to fetch version info', error);
            if (retryCount > this.maxRetryCount) {
                this.logger.error('Max retry count reached. Giving up on fetching version info for this session.', retryCount);
            }
            this.logger.debug('Retrying to fetch version info after timeout.', retryCount);
            this.timeoutHandle = setTimeout(() => {
                this.loadAndSetState(retryCount + 1);
            }, this.config.configurations['valorant-version-read']['retry-timeout-ms']);
        }
    }

    onModuleInit() {
        this.unsubscribe = ProductSessionManager.onNewSessionLaunch(
            {
                eventBus: this.eventBus,
                productId: 'valorant',
                callback: (sessionId, session) => {
                    if (sessionId === this.lastSeesSessionId) {
                        return;
                    }
                    this.lastSeesSessionId = sessionId;
                    this.loadAndSetState();
                },
            },
        );
    }


    onModuleDestroy() {
        this.unsubscribe?.();
        this.unsubscribe = null;
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
        }
        this.lastSeesSessionId = null;
    }

    deleteState(): void {
        this.manager.deleteState();
    }

    getView(): MinimalVersionInfoDTO | null {
        return this.manager.getView();
    }

    updateValue(value: MinimalVersionInfoDTO): void {
        this.manager.updateValue(value);
    }
}