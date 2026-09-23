import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { replays } from './replays.schema';
import { tags } from './tags.schema';

export const replay_tags = sqliteTable('replay_tags', {
        replay_uuid: text('replay_uuid')
            .notNull()
            .references(() => replays.uuid, { onDelete: 'cascade' }),
        tag_id: integer('tag_id')
            .notNull()
            .references(() => tags.id, { onDelete: 'restrict' }),
    },
    (table) => [
        primaryKey({ columns: [table.replay_uuid, table.tag_id] }),
        index('replay_tags_tag_id_idx').on(table.tag_id),
    ],
);