import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getChecklist } from "../../../lib/api";
import { ChecklistActions } from "./ChecklistActions";

export default async function ChecklistDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const checklist = await getChecklist(id);
	if (!checklist) notFound();

	const { userId } = await auth();
	const isOwner = !!userId && userId === checklist.user_id;

	return (
		<main>
			<Link href="/" className="back-link">
				&larr; チェックリスト一覧に戻る
			</Link>

			<div className="detail-header">
				<span className="badge">{checklist.category}</span>
				<h1>{checklist.title}</h1>
				{checklist.description && <p>{checklist.description}</p>}
			</div>

			<div className="section-label">アイテム</div>
			<ChecklistActions
				checklistId={checklist.id}
				initialItems={checklist.items}
				isOwner={isOwner}
			/>
		</main>
	);
}
