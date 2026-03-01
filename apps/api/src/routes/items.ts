import {
	CreateItemSchema,
	ListItemsQuerySchema,
	UpdateItemSchema,
} from "@flarestack/shared";
import { getAuth } from "@hono/clerk-auth";
import { Hono } from "hono";
import type { Bindings } from "../index";
import { requireAuth } from "../middleware/auth";

export const items = new Hono<{ Bindings: Bindings }>();

items.onError((err, c) => {
	if (err instanceof SyntaxError) {
		return c.json({ error: "Invalid JSON" }, 400);
	}
	throw err;
});

// POST /items — Create (auth required)
items.post("/", requireAuth, async (c) => {
	const body = await c.req.json();
	const parsed = CreateItemSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: parsed.error.flatten() }, 400);
	}

	const { title, description } = parsed.data;
	const auth = getAuth(c);
	const userId = auth?.userId;

	const result = await c.env.DB.prepare(
		`INSERT INTO items (title, description, user_id)
     VALUES (?, ?, ?)
     RETURNING *`,
	)
		.bind(title, description, userId)
		.first();

	return c.json(result, 201);
});

// GET /items — List (public)
items.get("/", async (c) => {
	const query = Object.fromEntries(new URL(c.req.url).searchParams);
	const parsed = ListItemsQuerySchema.safeParse(query);
	if (!parsed.success) {
		return c.json({ error: parsed.error.flatten() }, 400);
	}

	const { status, limit, offset } = parsed.data;

	const conditions: string[] = [];
	const binds: unknown[] = [];

	if (status) {
		conditions.push("status = ?");
		binds.push(status);
	}

	const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

	const countRow = await c.env.DB.prepare(
		`SELECT COUNT(*) as total FROM items ${where}`,
	)
		.bind(...binds)
		.first<{ total: number }>();

	const rows = await c.env.DB.prepare(
		`SELECT * FROM items ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
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

// GET /items/:id — Get by ID (public)
items.get("/:id", async (c) => {
	const id = c.req.param("id");
	const row = await c.env.DB.prepare("SELECT * FROM items WHERE id = ?")
		.bind(id)
		.first();

	if (!row) {
		return c.json({ error: "Item not found" }, 404);
	}
	return c.json(row);
});

// PATCH /items/:id — Partial update (auth required)
items.patch("/:id", requireAuth, async (c) => {
	const id = c.req.param("id");
	const body = await c.req.json();
	const parsed = UpdateItemSchema.safeParse(body);
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
		`UPDATE items SET ${setClauses.join(", ")} WHERE id = ? RETURNING *`,
	)
		.bind(...binds, id)
		.first();

	if (!result) {
		return c.json({ error: "Item not found" }, 404);
	}
	return c.json(result);
});
