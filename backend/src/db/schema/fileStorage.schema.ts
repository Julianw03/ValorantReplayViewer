import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { v7 as uuidv7 } from 'uuid';
import { sql } from 'drizzle-orm';

export const file_storage = sqliteTable(
    'file', {
        uuid: text('uuid')
            .primaryKey()
            .$defaultFn(() => uuidv7()),

        path: text('path')
            .notNull(),

        size_bytes: integer('size_bytes')
            .notNull(),

        mtime_s: integer('mtime', { mode: 'timestamp' })
            .notNull(),

        sha256: text('sha256')
            .notNull(),
    },
    (table) => [
        check('path_non_empty', sql`length(trim(path)) > 0`),
        check('size_positive', sql`size_bytes>= 0`),
        check('sha256_expected_size', sql`length(sha256) = 64`),
    ],
);