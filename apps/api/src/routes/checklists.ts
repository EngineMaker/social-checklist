import { getAuth } from "@hono/clerk-auth";
import {
	CreateChecklistItemSchema,
	CreateChecklistSchema,
	ListChecklistsQuerySchema,
	UpdateChecklistItemSchema,
	UpdateChecklistSchema,
} from "@social-checklist/shared";
import { Hono } from "hono";
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
	const row = await db
		.prepare("SELECT user_id FROM checklists WHERE id = ?")
		.bind(id)
		.first<{ user_id: string | null }>();
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

	const result = await c.env.DB.prepare(
		`INSERT INTO checklists (title, description, category, user_id, is_public)
     VALUES (?, ?, ?, ?, ?)
     RETURNING *`,
	)
		.bind(title, description ?? null, category, userId, is_public)
		.first();

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

	const conditions: string[] = ["is_public = 1"];
	const binds: unknown[] = [];

	if (category) {
		conditions.push("category = ?");
		binds.push(category);
	}

	const where = `WHERE ${conditions.join(" AND ")}`;

	const countRow = await c.env.DB.prepare(
		`SELECT COUNT(*) as total FROM checklists ${where}`,
	)
		.bind(...binds)
		.first<{ total: number }>();

	const rows = await c.env.DB.prepare(
		`SELECT * FROM checklists ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
	)
		.bind(...binds, limit, offset)
		.all();

	return c.json({
		data: rows.results,
		total: countRow?.total ?? 0,
		limit,
		offset,
	});
});

// GET /checklists/:id — Get checklist with items
checklists.get("/:id", async (c) => {
	const id = c.req.param("id");
	const checklist = await c.env.DB.prepare(
		"SELECT * FROM checklists WHERE id = ?",
	)
		.bind(id)
		.first();

	if (!checklist) {
		return c.json({ error: "Checklist not found" }, 404);
	}

	const items = await c.env.DB.prepare(
		"SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY sort_order ASC, created_at ASC",
	)
		.bind(id)
		.all();

	return c.json({ ...checklist, items: items.results });
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

	const fields = parsed.data;
	const setClauses: string[] = [];
	const binds: unknown[] = [];

	for (const [key, value] of Object.entries(fields)) {
		setClauses.push(`${key} = ?`);
		binds.push(value ?? null);
	}
	setClauses.push("updated_at = datetime('now')");

	const result = await c.env.DB.prepare(
		`UPDATE checklists SET ${setClauses.join(", ")} WHERE id = ? RETURNING *`,
	)
		.bind(...binds, id)
		.first();

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

	const result = await c.env.DB.prepare(
		`INSERT INTO checklist_items (checklist_id, title, product_url, sort_order)
     VALUES (?, ?, ?, ?)
     RETURNING *`,
	)
		.bind(checklistId, title, product_url ?? null, sort_order)
		.first();

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

	const fields = parsed.data;
	const setClauses: string[] = [];
	const binds: unknown[] = [];

	for (const [key, value] of Object.entries(fields)) {
		setClauses.push(`${key} = ?`);
		binds.push(value ?? null);
	}
	setClauses.push("updated_at = datetime('now')");

	const result = await c.env.DB.prepare(
		`UPDATE checklist_items SET ${setClauses.join(", ")} WHERE id = ? AND checklist_id = ? RETURNING *`,
	)
		.bind(...binds, itemId, checklistId)
		.first();

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

	const result = await c.env.DB.prepare(
		"DELETE FROM checklist_items WHERE id = ? AND checklist_id = ? RETURNING id",
	)
		.bind(itemId, checklistId)
		.first();

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

	const source = await c.env.DB.prepare("SELECT * FROM checklists WHERE id = ?")
		.bind(sourceId)
		.first<{
			id: string;
			title: string;
			description: string | null;
			category: string;
		}>();

	if (!source) {
		return c.json({ error: "Checklist not found" }, 404);
	}

	const newChecklist = await c.env.DB.prepare(
		`INSERT INTO checklists (title, description, category, user_id, is_public, forked_from)
     VALUES (?, ?, ?, ?, 1, ?)
     RETURNING *`,
	)
		.bind(source.title, source.description, source.category, userId, sourceId)
		.first();

	if (!newChecklist) {
		return c.json({ error: "Failed to create fork" }, 500);
	}

	const items = await c.env.DB.prepare(
		"SELECT title, product_url, sort_order FROM checklist_items WHERE checklist_id = ? ORDER BY sort_order ASC",
	)
		.bind(sourceId)
		.all<{ title: string; product_url: string | null; sort_order: number }>();

	for (const item of items.results) {
		await c.env.DB.prepare(
			`INSERT INTO checklist_items (checklist_id, title, product_url, sort_order)
       VALUES (?, ?, ?, ?)`,
		)
			.bind(
				(newChecklist as Record<string, unknown>).id,
				item.title,
				item.product_url,
				item.sort_order,
			)
			.run();
	}

	const forkedItems = await c.env.DB.prepare(
		"SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY sort_order ASC",
	)
		.bind((newChecklist as Record<string, unknown>).id)
		.all();

	return c.json({ ...newChecklist, items: forkedItems.results }, 201);
});
