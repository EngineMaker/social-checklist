import { ItemStatus } from "@flarestack/shared";

export default function Home() {
	const statuses = ItemStatus.options;

	return (
		<main>
			<h1>Flarestack</h1>
			<p>Full-stack Cloudflare application template</p>

			<section>
				<h2>Item Statuses</h2>
				<ul>
					{statuses.map((status) => (
						<li key={status}>{status}</li>
					))}
				</ul>
			</section>

			<section>
				<h2>Tech Stack</h2>
				<ul>
					<li>Turborepo</li>
					<li>Hono API</li>
					<li>Next.js</li>
					<li>Cloudflare D1</li>
					<li>Clerk Auth</li>
				</ul>
			</section>
		</main>
	);
}
