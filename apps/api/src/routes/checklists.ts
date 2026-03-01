import { getAuth } from "@hono/clerk-auth";
import {
	CreateChecklistItemSchema,
	CreateChecklistSchema,
	ListChecklistsQuerySchema,
	UpdateChecklistItemSchema,
	UpdateChecklistSchema,
} from "@social-checklist/shared";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../db";
import { checklistItems, checklists as checklistsTable } from "../db/schema";
import type { Bindings } from "../index";
import { requireAuth } from "../middleware/auth";

export const checklists = new Hono<{ Bindings: Bindings }>();

checklists.onError((err, c) => {
	if (err instanceof SyntaxError) {
		return c.json({ error: "Invalid JSON" }, 400);
	}
	throw err;
});

// --- Ownership helper ---

async function getChecklistOwner(
	db: D1Database,
	id: string,
): Promise<{ found: boolean; userId: string | null }> {
	const drizzle = getDb(db);
	const row = await drizzle
		.select({ user_id: checklistsTable.user_id })
		.from(checklistsTable)
		.where(eq(checklistsTable.id, id))
		.get();
	if (!row) return { found: false, userId: null };
	return { found: true, userId: row.user_id };
}

// POST /checklists — Create (auth required)
checklists.post("/", requireAuth, async (c) => {
	const body = await c.req.json();
	const parsed = CreateChecklistSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: parsed.error.flatten() }, 400);
	}

	const { title, description, category, is_public } = parsed.data;
	const auth = getAuth(c);
	const userId = auth?.userId;

	const db = getDb(c.env.DB);
	const result = await db
		.insert(checklistsTable)
		.values({
			title,
			description: description ?? null,
			category,
			user_id: userId ?? null,
			is_public,
		})
		.returning()
		.get();

	return c.json(result, 201);
});

// GET /checklists — List public checklists
checklists.get("/", async (c) => {
	const query = Object.fromEntries(new URL(c.req.url).searchParams);
	const parsed = ListChecklistsQuerySchema.safeParse(query);
	if (!parsed.success) {
		return c.json({ error: parsed.error.flatten() }, 400);
	}

	const { category, limit, offset } = parsed.data;

	const conditions = [eq(checklistsTable.is_public, 1)];
	if (category) {
		conditions.push(eq(checklistsTable.category, category));
	}
	const where = and(...conditions);

	const db = getDb(c.env.DB);

	const countResult = await db
		.select({ total: count() })
		.from(checklistsTable)
		.where(where)
		.get();

	const rows = await db
		.select()
		.from(checklistsTable)
		.where(where)
		.orderBy(desc(checklistsTable.created_at))
		.limit(limit)
		.offset(offset)
		.all();

	return c.json({
		data: rows,
		total: countResult?.total ?? 0,
		limit,
		offset,
	});
});

// GET /checklists/:id — Get checklist with items
checklists.get("/:id", async (c) => {
	const id = c.req.param("id");
	const db = getDb(c.env.DB);

	const checklist = await db
		.select()
		.from(checklistsTable)
		.where(eq(checklistsTable.id, id))
		.get();

	if (!checklist) {
		return c.json({ error: "Checklist not found" }, 404);
	}

	const items = await db
		.select()
		.from(checklistItems)
		.where(eq(checklistItems.checklist_id, id))
		.orderBy(asc(checklistItems.sort_order), asc(checklistItems.created_at))
		.all();

	return c.json({ ...checklist, items });
});

// PATCH /checklists/:id — Update (owner only)
checklists.patch("/:id", requireAuth, async (c) => {
	const id = c.req.param("id");
	const auth = getAuth(c);

	const owner = await getChecklistOwner(c.env.DB, id);
	if (!owner.found) {
		return c.json({ error: "Checklist not found" }, 404);
	}
	if (owner.userId !== auth?.userId) {
		return c.json({ error: "Forbidden" }, 403);
	}

	const body = await c.req.json();
	const parsed = UpdateChecklistSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: parsed.error.flatten() }, 400);
	}

	const db = getDb(c.env.DB);
	const result = await db
		.update(checklistsTable)
		.set({ ...parsed.data, updated_at: sql`datetime('now')` })
		.where(eq(checklistsTable.id, id))
		.returning()
		.get();

	return c.json(result);
});

// POST /checklists/:id/items — Add item (owner only)
checklists.post("/:id/items", requireAuth, async (c) => {
	const checklistId = c.req.param("id");
	const auth = getAuth(c);

	const owner = await getChecklistOwner(c.env.DB, checklistId);
	if (!owner.found) {
		return c.json({ error: "Checklist not found" }, 404);
	}
	if (owner.userId !== auth?.userId) {
		return c.json({ error: "Forbidden" }, 403);
	}

	const body = await c.req.json();
	const parsed = CreateChecklistItemSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: parsed.error.flatten() }, 400);
	}

	const { title, product_url, sort_order } = parsed.data;

	const db = getDb(c.env.DB);
	const result = await db
		.insert(checklistItems)
		.values({
			checklist_id: checklistId,
			title,
			product_url: product_url ?? null,
			sort_order,
		})
		.returning()
		.get();

	return c.json(result, 201);
});

// PATCH /checklists/:id/items/:itemId — Update item (owner only)
checklists.patch("/:id/items/:itemId", requireAuth, async (c) => {
	const checklistId = c.req.param("id");
	const itemId = c.req.param("itemId");
	const auth = getAuth(c);

	const owner = await getChecklistOwner(c.env.DB, checklistId);
	if (!owner.found) {
		return c.json({ error: "Checklist not found" }, 404);
	}
	if (owner.userId !== auth?.userId) {
		return c.json({ error: "Forbidden" }, 403);
	}

	const body = await c.req.json();
	const parsed = UpdateChecklistItemSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: parsed.error.flatten() }, 400);
	}

	const db = getDb(c.env.DB);
	const result = await db
		.update(checklistItems)
		.set({ ...parsed.data, updated_at: sql`datetime('now')` })
		.where(
			and(
				eq(checklistItems.id, itemId),
				eq(checklistItems.checklist_id, checklistId),
			),
		)
		.returning()
		.get();

	if (!result) {
		return c.json({ error: "Item not found" }, 404);
	}
	return c.json(result);
});

// DELETE /checklists/:id/items/:itemId — Delete item (owner only)
checklists.delete("/:id/items/:itemId", requireAuth, async (c) => {
	const checklistId = c.req.param("id");
	const itemId = c.req.param("itemId");
	const auth = getAuth(c);

	const owner = await getChecklistOwner(c.env.DB, checklistId);
	if (!owner.found) {
		return c.json({ error: "Checklist not found" }, 404);
	}
	if (owner.userId !== auth?.userId) {
		return c.json({ error: "Forbidden" }, 403);
	}

	const db = getDb(c.env.DB);
	const result = await db
		.delete(checklistItems)
		.where(
			and(
				eq(checklistItems.id, itemId),
				eq(checklistItems.checklist_id, checklistId),
			),
		)
		.returning({ id: checklistItems.id })
		.get();

	if (!result) {
		return c.json({ error: "Item not found" }, 404);
	}
	return c.json({ deleted: true });
});

// POST /checklists/:id/fork — Fork a checklist (auth required)
checklists.post("/:id/fork", requireAuth, async (c) => {
	const sourceId = c.req.param("id");
	const auth = getAuth(c);
	const userId = auth?.userId;

	const db = getDb(c.env.DB);

	const source = await db
		.select()
		.from(checklistsTable)
		.where(eq(checklistsTable.id, sourceId))
		.get();

	if (!source) {
		return c.json({ error: "Checklist not found" }, 404);
	}

	const newChecklist = await db
		.insert(checklistsTable)
		.values({
			title: source.title,
			description: source.description,
			category: source.category,
			user_id: userId ?? null,
			is_public: 1,
			forked_from: sourceId,
		})
		.returning()
		.get();

	const sourceItems = await db
		.select({
			title: checklistItems.title,
			product_url: checklistItems.product_url,
			sort_order: checklistItems.sort_order,
		})
		.from(checklistItems)
		.where(eq(checklistItems.checklist_id, sourceId))
		.orderBy(asc(checklistItems.sort_order))
		.all();

	if (sourceItems.length > 0) {
		await db
			.insert(checklistItems)
			.values(
				sourceItems.map((item) => ({
					checklist_id: newChecklist.id,
					title: item.title,
					product_url: item.product_url,
					sort_order: item.sort_order,
				})),
			)
			.run();
	}

	const forkedItems = await db
		.select()
		.from(checklistItems)
		.where(eq(checklistItems.checklist_id, newChecklist.id))
		.orderBy(asc(checklistItems.sort_order))
		.all();

	return c.json({ ...newChecklist, items: forkedItems }, 201);
});
