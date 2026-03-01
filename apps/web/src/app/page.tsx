import { ChecklistCategory } from "@social-checklist/shared";
import Link from "next/link";
import { type Checklist, listChecklists } from "../lib/api";

export default async function Home({
	searchParams,
}: {
	searchParams: Promise<{ category?: string }>;
}) {
	const { category } = await searchParams;
	const categories = ChecklistCategory.options;

	let checklists: Checklist[] = [];
	try {
		const res = await listChecklists(category);
		checklists = res.data;
	} catch (e) {
		console.error("Failed to fetch checklists:", e);
	}

	return (
		<main>
			<section className="hero">
				<h1>Social Checklist</h1>
				<p>Create, share, and fork checklists for any event</p>
			</section>

			<ul className="category-filter">
				<li>
					<Link href="/" className={!category ? "active" : ""}>
						All
					</Link>
				</li>
				{categories.map((cat) => (
					<li key={cat}>
						<Link
							href={`/?category=${cat}`}
							className={category === cat ? "active" : ""}
						>
							{cat}
						</Link>
					</li>
				))}
			</ul>

			{checklists.length === 0 ? (
				<div className="empty">
					<p>No checklists yet. Be the first to create one!</p>
				</div>
			) : (
				<ul className="card-grid">
					{checklists.map((cl) => (
						<li key={cl.id}>
							<Link href={`/checklists/${cl.id}`} className="card">
								<span className="badge">{cl.category}</span>
								<h3>{cl.title}</h3>
								{cl.description && <p>{cl.description}</p>}
							</Link>
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
