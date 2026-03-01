import { clerkMiddleware } from "@hono/clerk-auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { health } from "./routes/health";
import { items } from "./routes/items";

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
			allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
			allowHeaders: ["Content-Type", "Authorization"],
		}),
	);

	app.use(clerkMiddleware());

	app.get("/", (c) => {
		return c.json({ name: "Flarestack API", status: "ok" });
	});

	app.route("/health", health);
	app.route("/items", items);

	return app;
}

export default createApp();
