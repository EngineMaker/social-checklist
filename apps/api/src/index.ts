import { clerkMiddleware } from "@hono/clerk-auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { checklists } from "./routes/checklists";
import { health } from "./routes/health";

export type Bindings = {
	DB: D1Database;
	CLERK_SECRET_KEY: string;
	CLERK_PUBLISHABLE_KEY: string;
};

export function createApp() {
	const app = new Hono<{ Bindings: Bindings }>();

	app.use(
		cors({
			origin: ["http://localhost:3000"],
			allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
			allowHeaders: ["Content-Type", "Authorization"],
		}),
	);

	app.use(clerkMiddleware());

	app.get("/", (c) => {
		return c.json({ name: "Social Checklist API", status: "ok" });
	});

	app.route("/health", health);
	app.route("/checklists", checklists);

	return app;
}

export default createApp();
