import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const checklists = sqliteTable(
	"checklists",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID().replace(/-/g, "")),
		title: text("title").notNull(),
		description: text("description"),
		category: text("category").notNull(),
		user_id: text("user_id"),
		is_public: integer("is_public").notNull().default(1),
		forked_from: text("forked_from"),
		created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
		updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
	},
	(table) => [
		index("idx_checklists_category").on(table.category),
		index("idx_checklists_user_id").on(table.user_id),
		index("idx_checklists_is_public").on(table.is_public),
	],
);

export const checklistItems = sqliteTable(
	"checklist_items",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID().replace(/-/g, "")),
		checklist_id: text("checklist_id")
			.notNull()
			.references(() => checklists.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		product_url: text("product_url"),
		sort_order: integer("sort_order").notNull().default(0),
		is_checked: integer("is_checked").notNull().default(0),
		created_at: text("created_at").notNull().default(sql`(datetime('now'))`),
		updated_at: text("updated_at").notNull().default(sql`(datetime('now'))`),
	},
	(table) => [index("idx_checklist_items_checklist_id").on(table.checklist_id)],
);
