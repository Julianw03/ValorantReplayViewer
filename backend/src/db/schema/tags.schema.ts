import { sqliteTable, integer, text, unique } from 'drizzle-orm/sqlite-core';

export const tags = sqliteTable("tags", {
    id: integer("id").primaryKey(),
    name: text("name")
        .notNull(),
    color_hex: text("color_hex")
        .notNull()
        .default("#AFAFAF"),
}, (table) => [
    unique('tags_name_unique').on(table.name),
])