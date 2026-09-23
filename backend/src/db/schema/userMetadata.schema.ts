import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { replays } from './replays.schema';

export const replayCustomizableData = sqliteTable('replayCustomizableData', {
    uuid: text('replay_uuid')
        .primaryKey()
        .references(() => replays.uuid, { onDelete: 'cascade' }),
    name: text('name')
            .notNull(),
    notes: text('notes'),
    version: integer('version')
        .notNull()
        .default(1),
});
