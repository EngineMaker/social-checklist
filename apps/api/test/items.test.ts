import { env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let mockUserId: string | null = "test-user-123";

vi.mock("@hono/clerk-auth", () => ({
	clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) => {
		await next();
	},
	getAuth: () => ({ userId: mockUserId }),
}));

import { createApp } from "../src/index";

const app = createApp();

type Item = {
	id: string;
	title: string;
	description: string;
	status: string;
	user_id: string | null;
	created_at: string;
	updated_at: string;
};

type ItemList = {
	data: Item[];
	total: number;
	limit: number;
	offset: number;
};

const MIGRATION =
	"CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), title TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'closed')), user_id TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));";

const validItem = {
	title: "Sample item",
	description: "A sample item for testing",
};

async function createItem(data = validItem) {
	return app.request(
		"/items",
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		},
		env,
	);
}

describe("Items CRUD", () => {
	beforeAll(async () => {
		await env.DB.exec(MIGRATION);
	});

	beforeEach(async () => {
		await env.DB.exec("DELETE FROM items");
		mockUserId = "test-user-123";
	});

	// --- Authentication ---
	describe("Authentication", () => {
		it("returns 401 for unauthenticated POST", async () => {
			mockUserId = null;
			const res = await createItem();
			expect(res.status).toBe(401);
			const body = (await res.json()) as { error: string };
			expect(body.error).toBe("Unauthorized");
		});

		it("returns 401 for unauthenticated PATCH", async () => {
			const createRes = await createItem();
			const created = (await createRes.json()) as Item;

			mockUserId = null;
			const res = await app.request(
				`/items/${created.id}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ title: "Updated" }),
				},
				env,
			);
			expect(res.status).toBe(401);
		});

		it("allows unauthenticated GET list", async () => {
			mockUserId = null;
			const res = await app.request("/items", {}, env);
			expect(res.status).toBe(200);
		});

		it("allows unauthenticated GET by id", async () => {
			const createRes = await createItem();
			const created = (await createRes.json()) as Item;

			mockUserId = null;
			const res = await app.request(`/items/${created.id}`, {}, env);
			expect(res.status).toBe(200);
		});
	});

	// --- POST /items ---
	describe("POST /items", () => {
		it("creates an item with user_id and returns 201", async () => {
			const res = await createItem();
			expect(res.status).toBe(201);
			const body = (await res.json()) as Item;
			expect(body.title).toBe(validItem.title);
			expect(body.status).toBe("open");
			expect(body.user_id).toBe("test-user-123");
			expect(body.id).toBeDefined();
			expect(body.created_at).toBeDefined();
		});

		it("rejects missing required fields", async () => {
			const res = await createItem({ title: "Only title" } as never);
			expect(res.status).toBe(400);
			const body = (await res.json()) as { error: unknown };
			expect(body.error).toBeDefined();
		});

		it("rejects invalid JSON body", async () => {
			const res = await app.request(
				"/items",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: "not json",
				},
				env,
			);
			expect(res.status).toBe(400);
			const body = (await res.json()) as { error: string };
			expect(body.error).toBe("Invalid JSON");
		});
	});

	// --- GET /items ---
	describe("GET /items", () => {
		it("returns empty list initially", async () => {
			const res = await app.request("/items", {}, env);
			expect(res.status).toBe(200);
			const body = (await res.json()) as ItemList;
			expect(body.data).toEqual([]);
			expect(body.total).toBe(0);
		});

		it("returns created items", async () => {
			await createItem();
			await createItem({ ...validItem, title: "Second item" });

			const res = await app.request("/items", {}, env);
			expect(res.status).toBe(200);
			const body = (await res.json()) as ItemList;
			expect(body.data).toHaveLength(2);
			expect(body.total).toBe(2);
			expect(body.limit).toBe(20);
			expect(body.offset).toBe(0);
		});

		it("filters by status", async () => {
			await createItem();

			const res = await app.request("/items?status=open", {}, env);
			const body = (await res.json()) as ItemList;
			expect(body.data).toHaveLength(1);

			const res2 = await app.request("/items?status=closed", {}, env);
			const body2 = (await res2.json()) as ItemList;
			expect(body2.data).toHaveLength(0);
		});

		it("supports limit and offset", async () => {
			await createItem({ ...validItem, title: "Item 1" });
			await createItem({ ...validItem, title: "Item 2" });
			await createItem({ ...validItem, title: "Item 3" });

			const res = await app.request("/items?limit=2&offset=0", {}, env);
			const body = (await res.json()) as ItemList;
			expect(body.data).toHaveLength(2);
			expect(body.total).toBe(3);

			const res2 = await app.request("/items?limit=2&offset=2", {}, env);
			const body2 = (await res2.json()) as ItemList;
			expect(body2.data).toHaveLength(1);
		});
	});

	// --- GET /items/:id ---
	describe("GET /items/:id", () => {
		it("returns an item by id", async () => {
			const createRes = await createItem();
			const created = (await createRes.json()) as Item;

			const res = await app.request(`/items/${created.id}`, {}, env);
			expect(res.status).toBe(200);
			const body = (await res.json()) as Item;
			expect(body.id).toBe(created.id);
			expect(body.title).toBe(validItem.title);
		});

		it("returns 404 for non-existent id", async () => {
			const res = await app.request("/items/nonexistent", {}, env);
			expect(res.status).toBe(404);
			const body = (await res.json()) as { error: string };
			expect(body.error).toBe("Item not found");
		});
	});

	// --- PATCH /items/:id ---
	describe("PATCH /items/:id", () => {
		it("updates title", async () => {
			const createRes = await createItem();
			const created = (await createRes.json()) as Item;

			const res = await app.request(
				`/items/${created.id}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ title: "Updated title" }),
				},
				env,
			);
			expect(res.status).toBe(200);
			const body = (await res.json()) as Item;
			expect(body.title).toBe("Updated title");
			expect(body.description).toBe(validItem.description);
		});

		it("updates status", async () => {
			const createRes = await createItem();
			const created = (await createRes.json()) as Item;

			const res = await app.request(
				`/items/${created.id}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ status: "done" }),
				},
				env,
			);
			expect(res.status).toBe(200);
			const body = (await res.json()) as Item;
			expect(body.status).toBe("done");
		});

		it("updates updated_at timestamp", async () => {
			const createRes = await createItem();
			const created = (await createRes.json()) as Item;

			const res = await app.request(
				`/items/${created.id}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ title: "New title" }),
				},
				env,
			);
			const body = (await res.json()) as Item;
			expect(body.updated_at).toBeDefined();
		});

		it("returns 404 for non-existent id", async () => {
			const res = await app.request(
				"/items/nonexistent",
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ title: "Updated" }),
				},
				env,
			);
			expect(res.status).toBe(404);
		});

		it("rejects empty body", async () => {
			const createRes = await createItem();
			const created = (await createRes.json()) as Item;

			const res = await app.request(
				`/items/${created.id}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({}),
				},
				env,
			);
			expect(res.status).toBe(400);
		});
	});
});
