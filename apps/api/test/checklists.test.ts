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

type Checklist = {
	id: string;
	title: string;
	description: string | null;
	category: string;
	user_id: string | null;
	is_public: number;
	forked_from: string | null;
	created_at: string;
	updated_at: string;
	items: ChecklistItem[];
};

type ChecklistItem = {
	id: string;
	checklist_id: string;
	title: string;
	product_url: string | null;
	sort_order: number;
	is_checked: number;
	created_at: string;
	updated_at: string;
};

type ChecklistList = {
	data: Checklist[];
	total: number;
	limit: number;
	offset: number;
};

const MIGRATION_CHECKLISTS =
	"CREATE TABLE IF NOT EXISTS checklists (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), title TEXT NOT NULL, description TEXT, category TEXT NOT NULL CHECK (category IN ('camping', 'wedding', 'startup', 'moving', 'travel', 'other')), user_id TEXT, is_public INTEGER NOT NULL DEFAULT 1, forked_from TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));";

const MIGRATION_ITEMS =
	"CREATE TABLE IF NOT EXISTS checklist_items (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), checklist_id TEXT NOT NULL REFERENCES checklists(id) ON DELETE CASCADE, title TEXT NOT NULL, product_url TEXT, sort_order INTEGER NOT NULL DEFAULT 0, is_checked INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));";

const validChecklist = {
	title: "Summer Camping Essentials",
	description: "Everything you need for a weekend camping trip",
	category: "camping",
};

async function createChecklist(data = validChecklist) {
	return app.request(
		"/checklists",
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		},
		env,
	);
}

async function addItem(
	checklistId: string,
	data = { title: "Tent", sort_order: 0 },
) {
	return app.request(
		`/checklists/${checklistId}/items`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		},
		env,
	);
}

describe("Checklists CRUD", () => {
	beforeAll(async () => {
		await env.DB.exec(MIGRATION_CHECKLISTS);
		await env.DB.exec(MIGRATION_ITEMS);
	});

	beforeEach(async () => {
		await env.DB.exec("DELETE FROM checklist_items");
		await env.DB.exec("DELETE FROM checklists");
		mockUserId = "test-user-123";
	});

	// --- Authentication ---
	describe("Authentication", () => {
		it("returns 401 for unauthenticated POST", async () => {
			mockUserId = null;
			const res = await createChecklist();
			expect(res.status).toBe(401);
			const body = (await res.json()) as { error: string };
			expect(body.error).toBe("Unauthorized");
		});

		it("returns 401 for unauthenticated PATCH", async () => {
			const createRes = await createChecklist();
			const created = (await createRes.json()) as Checklist;

			mockUserId = null;
			const res = await app.request(
				`/checklists/${created.id}`,
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
			const res = await app.request("/checklists", {}, env);
			expect(res.status).toBe(200);
		});

		it("allows unauthenticated GET by id", async () => {
			const createRes = await createChecklist();
			const created = (await createRes.json()) as Checklist;

			mockUserId = null;
			const res = await app.request(`/checklists/${created.id}`, {}, env);
			expect(res.status).toBe(200);
		});

		it("returns 401 for unauthenticated fork", async () => {
			const createRes = await createChecklist();
			const created = (await createRes.json()) as Checklist;

			mockUserId = null;
			const res = await app.request(
				`/checklists/${created.id}/fork`,
				{ method: "POST" },
				env,
			);
			expect(res.status).toBe(401);
		});
	});

	// --- POST /checklists ---
	describe("POST /checklists", () => {
		it("creates a checklist with user_id and returns 201", async () => {
			const res = await createChecklist();
			expect(res.status).toBe(201);
			const body = (await res.json()) as Checklist;
			expect(body.title).toBe(validChecklist.title);
			expect(body.category).toBe("camping");
			expect(body.user_id).toBe("test-user-123");
			expect(body.is_public).toBe(1);
			expect(body.forked_from).toBeNull();
			expect(body.id).toBeDefined();
			expect(body.created_at).toBeDefined();
		});

		it("creates a private checklist", async () => {
			const res = await createChecklist({
				...validChecklist,
				is_public: 0,
			} as never);
			expect(res.status).toBe(201);
			const body = (await res.json()) as Checklist;
			expect(body.is_public).toBe(0);
		});

		it("rejects missing required fields", async () => {
			const res = await createChecklist({ title: "Only title" } as never);
			expect(res.status).toBe(400);
			const body = (await res.json()) as { error: unknown };
			expect(body.error).toBeDefined();
		});

		it("rejects invalid category", async () => {
			const res = await createChecklist({
				...validChecklist,
				category: "invalid",
			} as never);
			expect(res.status).toBe(400);
		});

		it("rejects invalid JSON body", async () => {
			const res = await app.request(
				"/checklists",
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

	// --- GET /checklists ---
	describe("GET /checklists", () => {
		it("returns empty list initially", async () => {
			const res = await app.request("/checklists", {}, env);
			expect(res.status).toBe(200);
			const body = (await res.json()) as ChecklistList;
			expect(body.data).toEqual([]);
			expect(body.total).toBe(0);
		});

		it("returns public checklists only", async () => {
			await createChecklist();
			await createChecklist({ ...validChecklist, is_public: 0 } as never);

			const res = await app.request("/checklists", {}, env);
			const body = (await res.json()) as ChecklistList;
			expect(body.data).toHaveLength(1);
			expect(body.total).toBe(1);
		});

		it("filters by category", async () => {
			await createChecklist();
			await createChecklist({
				...validChecklist,
				title: "Wedding List",
				category: "wedding",
			});

			const res = await app.request("/checklists?category=camping", {}, env);
			const body = (await res.json()) as ChecklistList;
			expect(body.data).toHaveLength(1);
			expect(body.data[0]!.category).toBe("camping");
		});

		it("supports limit and offset", async () => {
			await createChecklist({ ...validChecklist, title: "List 1" });
			await createChecklist({ ...validChecklist, title: "List 2" });
			await createChecklist({ ...validChecklist, title: "List 3" });

			const res = await app.request("/checklists?limit=2&offset=0", {}, env);
			const body = (await res.json()) as ChecklistList;
			expect(body.data).toHaveLength(2);
			expect(body.total).toBe(3);

			const res2 = await app.request("/checklists?limit=2&offset=2", {}, env);
			const body2 = (await res2.json()) as ChecklistList;
			expect(body2.data).toHaveLength(1);
		});
	});

	// --- GET /checklists/:id ---
	describe("GET /checklists/:id", () => {
		it("returns checklist with items", async () => {
			const createRes = await createChecklist();
			const created = (await createRes.json()) as Checklist;
			await addItem(created.id, { title: "Tent", sort_order: 0 });
			await addItem(created.id, { title: "Sleeping bag", sort_order: 1 });

			const res = await app.request(`/checklists/${created.id}`, {}, env);
			expect(res.status).toBe(200);
			const body = (await res.json()) as Checklist;
			expect(body.id).toBe(created.id);
			expect(body.items).toHaveLength(2);
			expect(body.items[0]!.title).toBe("Tent");
			expect(body.items[1]!.title).toBe("Sleeping bag");
		});

		it("returns 404 for non-existent id", async () => {
			const res = await app.request("/checklists/nonexistent", {}, env);
			expect(res.status).toBe(404);
			const body = (await res.json()) as { error: string };
			expect(body.error).toBe("Checklist not found");
		});
	});

	// --- PATCH /checklists/:id ---
	describe("PATCH /checklists/:id", () => {
		it("updates title", async () => {
			const createRes = await createChecklist();
			const created = (await createRes.json()) as Checklist;

			const res = await app.request(
				`/checklists/${created.id}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ title: "Updated title" }),
				},
				env,
			);
			expect(res.status).toBe(200);
			const body = (await res.json()) as Checklist;
			expect(body.title).toBe("Updated title");
		});

		it("returns 403 for non-owner", async () => {
			const createRes = await createChecklist();
			const created = (await createRes.json()) as Checklist;

			mockUserId = "other-user-456";
			const res = await app.request(
				`/checklists/${created.id}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ title: "Hacked" }),
				},
				env,
			);
			expect(res.status).toBe(403);
			const body = (await res.json()) as { error: string };
			expect(body.error).toBe("Forbidden");
		});

		it("returns 404 for non-existent id", async () => {
			const res = await app.request(
				"/checklists/nonexistent",
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
			const createRes = await createChecklist();
			const created = (await createRes.json()) as Checklist;

			const res = await app.request(
				`/checklists/${created.id}`,
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

	// --- Checklist Items ---
	describe("POST /checklists/:id/items", () => {
		it("adds an item to a checklist", async () => {
			const createRes = await createChecklist();
			const created = (await createRes.json()) as Checklist;

			const res = await addItem(created.id);
			expect(res.status).toBe(201);
			const body = (await res.json()) as ChecklistItem;
			expect(body.title).toBe("Tent");
			expect(body.checklist_id).toBe(created.id);
			expect(body.is_checked).toBe(0);
		});

		it("adds an item with product_url", async () => {
			const createRes = await createChecklist();
			const created = (await createRes.json()) as Checklist;

			const res = await addItem(created.id, {
				title: "Camp Chair",
				sort_order: 1,
				product_url: "https://amazon.co.jp/dp/B123",
			} as never);
			expect(res.status).toBe(201);
			const body = (await res.json()) as ChecklistItem;
			expect(body.product_url).toBe("https://amazon.co.jp/dp/B123");
		});

		it("returns 403 for non-owner", async () => {
			const createRes = await createChecklist();
			const created = (await createRes.json()) as Checklist;

			mockUserId = "other-user-456";
			const res = await addItem(created.id);
			expect(res.status).toBe(403);
		});

		it("returns 404 for non-existent checklist", async () => {
			const res = await addItem("nonexistent");
			expect(res.status).toBe(404);
		});
	});

	describe("PATCH /checklists/:id/items/:itemId", () => {
		it("updates an item", async () => {
			const createRes = await createChecklist();
			const created = (await createRes.json()) as Checklist;
			const itemRes = await addItem(created.id);
			const item = (await itemRes.json()) as ChecklistItem;

			const res = await app.request(
				`/checklists/${created.id}/items/${item.id}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ is_checked: 1 }),
				},
				env,
			);
			expect(res.status).toBe(200);
			const body = (await res.json()) as ChecklistItem;
			expect(body.is_checked).toBe(1);
		});

		it("returns 403 for non-owner", async () => {
			const createRes = await createChecklist();
			const created = (await createRes.json()) as Checklist;
			const itemRes = await addItem(created.id);
			const item = (await itemRes.json()) as ChecklistItem;

			mockUserId = "other-user-456";
			const res = await app.request(
				`/checklists/${created.id}/items/${item.id}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ is_checked: 1 }),
				},
				env,
			);
			expect(res.status).toBe(403);
		});

		it("returns 404 for non-existent item", async () => {
			const createRes = await createChecklist();
			const created = (await createRes.json()) as Checklist;

			const res = await app.request(
				`/checklists/${created.id}/items/nonexistent`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ title: "Updated" }),
				},
				env,
			);
			expect(res.status).toBe(404);
		});
	});

	describe("DELETE /checklists/:id/items/:itemId", () => {
		it("deletes an item", async () => {
			const createRes = await createChecklist();
			const created = (await createRes.json()) as Checklist;
			const itemRes = await addItem(created.id);
			const item = (await itemRes.json()) as ChecklistItem;

			const res = await app.request(
				`/checklists/${created.id}/items/${item.id}`,
				{ method: "DELETE" },
				env,
			);
			expect(res.status).toBe(200);
			const body = (await res.json()) as { deleted: boolean };
			expect(body.deleted).toBe(true);

			// Verify item is gone
			const getRes = await app.request(`/checklists/${created.id}`, {}, env);
			const checklist = (await getRes.json()) as Checklist;
			expect(checklist.items).toHaveLength(0);
		});

		it("returns 403 for non-owner", async () => {
			const createRes = await createChecklist();
			const created = (await createRes.json()) as Checklist;
			const itemRes = await addItem(created.id);
			const item = (await itemRes.json()) as ChecklistItem;

			mockUserId = "other-user-456";
			const res = await app.request(
				`/checklists/${created.id}/items/${item.id}`,
				{ method: "DELETE" },
				env,
			);
			expect(res.status).toBe(403);
		});

		it("returns 404 for non-existent item", async () => {
			const createRes = await createChecklist();
			const created = (await createRes.json()) as Checklist;

			const res = await app.request(
				`/checklists/${created.id}/items/nonexistent`,
				{ method: "DELETE" },
				env,
			);
			expect(res.status).toBe(404);
		});
	});

	// --- Fork ---
	describe("POST /checklists/:id/fork", () => {
		it("forks a checklist with all items", async () => {
			const createRes = await createChecklist();
			const created = (await createRes.json()) as Checklist;
			await addItem(created.id, { title: "Tent", sort_order: 0 });
			await addItem(created.id, { title: "Sleeping bag", sort_order: 1 });

			mockUserId = "forker-user-789";
			const res = await app.request(
				`/checklists/${created.id}/fork`,
				{ method: "POST" },
				env,
			);
			expect(res.status).toBe(201);
			const body = (await res.json()) as Checklist;
			expect(body.title).toBe(validChecklist.title);
			expect(body.forked_from).toBe(created.id);
			expect(body.user_id).toBe("forker-user-789");
			expect(body.id).not.toBe(created.id);
			expect(body.items).toHaveLength(2);
			expect(body.items[0]!.title).toBe("Tent");
			expect(body.items[1]!.title).toBe("Sleeping bag");
		});

		it("forked items are unchecked", async () => {
			const createRes = await createChecklist();
			const created = (await createRes.json()) as Checklist;
			const itemRes = await addItem(created.id, {
				title: "Tent",
				sort_order: 0,
			});
			const item = (await itemRes.json()) as ChecklistItem;

			// Check the original item
			await app.request(
				`/checklists/${created.id}/items/${item.id}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ is_checked: 1 }),
				},
				env,
			);

			mockUserId = "forker-user-789";
			const res = await app.request(
				`/checklists/${created.id}/fork`,
				{ method: "POST" },
				env,
			);
			const body = (await res.json()) as Checklist;
			expect(body.items[0]!.is_checked).toBe(0);
		});

		it("returns 404 for non-existent checklist", async () => {
			const res = await app.request(
				"/checklists/nonexistent/fork",
				{ method: "POST" },
				env,
			);
			expect(res.status).toBe(404);
		});
	});
});
