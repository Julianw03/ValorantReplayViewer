import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Database from 'better-sqlite3';
import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from '@/db/schema';
import { PathProviderService } from '@/modules/PathProvider/PathProviderService';
import { getPackageAwarePath } from '@/utils/PackagedPath';

@Injectable()
export class ReplayDBConnection implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ReplayDBConnection.name);

    private sqlite: Database.Database | undefined = undefined;
    private database: BetterSQLite3Database<typeof schema> | undefined = undefined;

    constructor(private readonly pathProvider: PathProviderService) {
    }

    public onModuleInit(): void {
        const location = this.pathProvider.getPersistentPath('replays.db');
        if (!location) {
            throw new Error('ReplayDB location could not be resolved.');
        }
        fs.mkdirSync(path.dirname(location), { recursive: true });

        this.sqlite = new Database(location);
        this.sqlite.pragma('foreign_keys = ON');
        this.sqlite.pragma('journal_mode = WAL');

        this.database = drizzle(this.sqlite, { schema });

        this.logger.log('Running migrations...');
        migrate(this.database, {
            migrationsFolder: getPackageAwarePath('db', 'migrations'),
        });
    }

    public get db(): BetterSQLite3Database<typeof schema> {
        if (!this.database) {
            throw new Error('ReplayDbConnection has not been initialized.');
        }
        return this.database;
    }

    public onModuleDestroy(): void {
        this.sqlite?.close();
    }
}
