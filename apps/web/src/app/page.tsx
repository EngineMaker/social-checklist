import { ChecklistCategory } from "@social-checklist/shared";

export default function Home() {
	const categories = ChecklistCategory.options;

	return (
		<main>
			<h1>Social Checklist</h1>
			<p>Create, share, and fork checklists for any event</p>

			<section>
				<h2>Categories</h2>
				<ul>
					{categories.map((category) => (
						<li key={category}>{category}</li>
					))}
				</ul>
			</section>
		</main>
	);
}
