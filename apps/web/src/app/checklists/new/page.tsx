"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { ChecklistCategory } from "@social-checklist/shared";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { createChecklist } from "../../../lib/api";

export default function NewChecklistPage() {
	const { isSignedIn } = useUser();
	const { getToken } = useAuth();
	const router = useRouter();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState<string>("other");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");

	if (!isSignedIn) {
		return (
			<main>
				<div className="signin-prompt">
					<h2>Sign in to create a checklist</h2>
					<p>You need to be signed in to create a new checklist.</p>
				</div>
			</main>
		);
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError("");

		try {
			const token = await getToken();
			if (!token) throw new Error("Not authenticated");

			const checklist = await createChecklist(
				{ title, description: description || undefined, category },
				token,
			);
			router.push(`/checklists/${checklist.id}`);
		} catch {
			setError("Failed to create checklist. Please try again.");
			setSubmitting(false);
		}
	}

	return (
		<main>
			<h1 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>
				New Checklist
			</h1>
			<form onSubmit={handleSubmit} className="form">
				<div className="form-group">
					<label htmlFor="title">Title</label>
					<input
						id="title"
						type="text"
						required
						maxLength={200}
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="e.g. Weekend Camping Essentials"
					/>
				</div>

				<div className="form-group">
					<label htmlFor="description">Description (optional)</label>
					<textarea
						id="description"
						maxLength={2000}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="What is this checklist for?"
					/>
				</div>

				<div className="form-group">
					<label htmlFor="category">Category</label>
					<select
						id="category"
						value={category}
						onChange={(e) => setCategory(e.target.value)}
					>
						{ChecklistCategory.options.map((cat) => (
							<option key={cat} value={cat}>
								{cat.charAt(0).toUpperCase() + cat.slice(1)}
							</option>
						))}
					</select>
				</div>

				{error && (
					<p style={{ color: "#dc2626", fontSize: "0.85rem" }}>{error}</p>
				)}

				<button
					type="submit"
					className="btn btn-primary"
					disabled={submitting || !title.trim()}
				>
					{submitting ? "Creating..." : "Create Checklist"}
				</button>
			</form>
		</main>
	);
}
