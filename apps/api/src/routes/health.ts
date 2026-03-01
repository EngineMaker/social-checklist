import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../db";
import type { Bindings } from "../index";

export const health = new Hono<{ Bindings: Bindings }>();

health.get("/", async (c) => {
	try {
		const db = getDb(c.env.DB);
		const result = await db.get<{ ok: number }>(sql`SELECT 1 as ok`);
		return c.json({ status: "healthy", db: result });
	} catch (e) {
		return c.json({ status: "unhealthy", error: String(e) }, 500);
	}
});
