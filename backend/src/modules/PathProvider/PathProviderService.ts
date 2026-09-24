import { Injectable } from '@nestjs/common';
import path from 'node:path';
import os from 'node:os';
import { isPathWithin } from '@/utils/PathUtils';

export enum ReadableEnvVar {
    LOCALAPPDATA = 'LOCALAPPDATA',
}

@Injectable()
export class PathProviderService {
    private readonly appBaseDir: string;

    constructor() {
        const localAppData = this.getEnvVarDependentPath(ReadableEnvVar.LOCALAPPDATA) ??
            path.join(os.homedir(), 'AppData', 'Local');
        this.appBaseDir = path.join(localAppData, 'ValorantReplayViewer');
    }

    /**
     * Returns a path that is dependent on an env var prefix.
     * @param envVar The environment Variable to be used as a prefix
     * @param args The path parts to resolve
     * */
    public getEnvVarDependentPath(
        envVar: ReadableEnvVar,
        ...args: string[]
    ): undefined | string {
        if (!envVar || !Object.values(ReadableEnvVar).includes(envVar)) {
            return undefined;
        }
        const pathPrefix = process.env[envVar];
        if (!pathPrefix) {
            return undefined;
        }
        const parent = path.resolve(pathPrefix);
        if (!args) {
            return parent;
        }
        const resolved = path.resolve(parent, ...args);
        if (!isPathWithin(parent, resolved)) {
            return undefined;
        }
        return resolved;
    }

    public getPersistentPathBase(
        moduleScope: string | undefined = undefined,
    ) {
        if (!moduleScope) {
            return this.appBaseDir;
        }
        const parent = this.appBaseDir;
        const resolved = path.resolve(parent, moduleScope);
        if (!isPathWithin(parent, resolved)) {
            return undefined;
        }
        return resolved;
    }

    public getPersistentPath(
        ...parts: string[]) {
        const base = this.appBaseDir;
        const resolved = path.resolve(base, ...parts);
        if (!isPathWithin(base, resolved)) {
            console.log('Not within', base, resolved);
            return undefined;
        }
        return resolved;
    }
}