import { RiotClientParametersAcquisitionStrategy } from './RiotClientParametersAcquisitionStrategy';
import { RiotClientConnectionParameters } from './RiotClientConnectionParameters';
import * as process from 'node:process';
import fs from 'node:fs';
import path from 'path';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LockfileParameterAcquisitionStrategy
    implements RiotClientParametersAcquisitionStrategy
{
    private static readonly lockfileRegex =
        /(?<rcId>Riot Client):(?<pid>\d+):(?<port>\d+):(?<authSecret>\S+):(?<protocol>\w+)/;

    private readonly logger = new Logger(
        LockfileParameterAcquisitionStrategy.name,
    );

    // For now we just support Windows as Valorant is only available on Windows.
    async connect(): Promise<RiotClientConnectionParameters> {
        this.logger.debug('Connecting to Riot Client using lockfile strategy');
        switch (process.platform) {
            case 'win32':
                this.logger.debug(
                    'Detected Windows platform, proceeding as normal',
                );
                break;
            default:
                this.logger.debug(
                    'Unsupported platform for lockfile connection strategy',
                );
                throw new Error(
                    'Unsupported platform for lockfile connection strategy',
                );
        }

        const appDataPath = process.env.LOCALAPPDATA;
        if (!appDataPath) {
            this.logger.debug(
                'LOCALAPPDATA environment variable is not set, cannot find lockfile',
            );
            throw new Error('LOCALAPPDATA environment variable is not set');
        }

        const lockfilePath = path.join(
            appDataPath,
            'Riot Games',
            'Riot Client',
            'Config',
            'lockfile',
        );

        this.logger.debug(`Looking for lockfile at ${lockfilePath}`);

        let content: string;
        try {
            content = await fs.promises.readFile(lockfilePath, 'utf-8');
        } catch (err) {
            this.logger.error(
                `Failed to read lockfile at ${lockfilePath}`,
                err,
            );
            throw new Error(`Failed to read lockfile at ${lockfilePath}`);
        }

        const regex = LockfileParameterAcquisitionStrategy.lockfileRegex;
        const m = regex.exec(content);
        if (!m || !m.groups) {
            this.logger.debug(
                'Lockfile content does not match expected format',
            );
            throw new Error('Lockfile content does not match expected format');
        }

        const { rcId, pid, port, authSecret, protocol } = m.groups;
        this.logger.debug('Lockfile content parsed successfully', {
            rcId,
            pid,
            port,
            authSecret,
            protocol,
        });

        const numPid = parseInt(pid);
        const numPort = parseInt(port);

        return new RiotClientConnectionParameters(numPort, authSecret);
    }

    // We are not managing any state in this strategy, so disconnect is a no-op.
    disconnect(): Promise<void> {
        return Promise.resolve();
    }
}
