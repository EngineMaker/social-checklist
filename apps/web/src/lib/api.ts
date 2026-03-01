function getApiUrl() {
	return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
}

export interface Checklist {
	id: string;
	title: string;
	description: string | null;
	category: string;
	user_id: string | null;
	is_public: number;
	forked_from: string | null;
	created_at: string;
	updated_at: string;
}

export interface ChecklistItem {
	id: string;
	checklist_id: string;
	title: string;
	product_url: string | null;
	sort_order: number;
	is_checked: number;
	created_at: string;
	updated_at: string;
}

export interface ChecklistWithItems extends Checklist {
	items: ChecklistItem[];
}

export interface ListChecklistsResponse {
	data: Checklist[];
	total: number;
	limit: number;
	offset: number;
}

export async function listChecklists(
	category?: string,
): Promise<ListChecklistsResponse> {
	const url = getApiUrl();
	console.log("[api] listChecklists url:", url);
	const params = new URLSearchParams();
	if (category) params.set("category", category);
	const res = await fetch(`${url}/checklists?${params.toString()}`, {
		cache: "no-store",
	});
	console.log("[api] listChecklists status:", res.status);
	if (!res.ok) throw new Error("Failed to fetch checklists");
	return res.json();
}

export async function getChecklist(
	id: string,
): Promise<ChecklistWithItems | null> {
	const res = await fetch(`${getApiUrl()}/checklists/${id}`, {
		cache: "no-store",
	});
	if (res.status === 404) return null;
	if (!res.ok) throw new Error("Failed to fetch checklist");
	return res.json();
}

export async function createChecklist(
	data: { title: string; description?: string; category: string },
	token: string,
): Promise<Checklist> {
	const res = await fetch(`${getApiUrl()}/checklists`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(data),
	});
	if (!res.ok) throw new Error("Failed to create checklist");
	return res.json();
}

export async function addItem(
	checklistId: string,
	data: { title: string },
	token: string,
): Promise<ChecklistItem> {
	const res = await fetch(`${getApiUrl()}/checklists/${checklistId}/items`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(data),
	});
	if (!res.ok) throw new Error("Failed to add item");
	return res.json();
}

export async function deleteItem(
	checklistId: string,
	itemId: string,
	token: string,
): Promise<void> {
	const res = await fetch(
		`${getApiUrl()}/checklists/${checklistId}/items/${itemId}`,
		{
			method: "DELETE",
			headers: { Authorization: `Bearer ${token}` },
		},
	);
	if (!res.ok) throw new Error("Failed to delete item");
}
