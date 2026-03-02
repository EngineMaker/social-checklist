"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { addItem, type ChecklistItem, deleteItem } from "../../../lib/api";

export function ChecklistActions({
	checklistId,
	initialItems,
	isOwner,
}: {
	checklistId: string;
	initialItems: ChecklistItem[];
	isOwner: boolean;
}) {
	const { getToken } = useAuth();
	const router = useRouter();
	const [newTitle, setNewTitle] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleAdd(e: FormEvent) {
		e.preventDefault();
		if (!newTitle.trim()) return;
		setLoading(true);

		try {
			const token = await getToken();
			if (!token) return;
			await addItem(checklistId, { title: newTitle.trim() }, token);
			setNewTitle("");
			router.refresh();
		} finally {
			setLoading(false);
		}
	}

	async function handleDelete(itemId: string) {
		const token = await getToken();
		if (!token) return;
		await deleteItem(checklistId, itemId, token);
		router.refresh();
	}

	return (
		<div>
			{initialItems.length === 0 && !isOwner && (
				<p className="empty">アイテムはまだありません。</p>
			)}

			{initialItems.length > 0 && (
				<ul className="item-list">
					{initialItems.map((item) => (
						<li key={item.id} className="item-row">
							<span>{item.title}</span>
							{isOwner && (
								<button
									type="button"
									className="btn btn-danger"
									onClick={() => handleDelete(item.id)}
								>
									削除
								</button>
							)}
						</li>
					))}
				</ul>
			)}

			{isOwner && (
				<form onSubmit={handleAdd} className="add-item-form">
					<input
						type="text"
						placeholder="アイテムを追加..."
						value={newTitle}
						onChange={(e) => setNewTitle(e.target.value)}
						maxLength={200}
					/>
					<button
						type="submit"
						className="btn btn-primary"
						disabled={loading || !newTitle.trim()}
					>
						{loading ? "追加中..." : "追加"}
					</button>
				</form>
			)}

			{isOwner && initialItems.length === 0 && (
				<p
					style={{
						color: "#9ca3af",
						fontSize: "0.85rem",
						marginTop: "0.5rem",
					}}
				>
					チェックリストにアイテムを追加しましょう。
				</p>
			)}
		</div>
	);
}
