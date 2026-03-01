import { z } from "zod";

export const ChecklistCategory = z.enum([
	"camping",
	"wedding",
	"startup",
	"moving",
	"travel",
	"other",
]);
export type ChecklistCategory = z.infer<typeof ChecklistCategory>;

// --- Checklist ---

export const CreateChecklistSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().max(2000).optional(),
	category: ChecklistCategory,
	is_public: z.number().int().min(0).max(1).default(1),
});
export type CreateChecklist = z.infer<typeof CreateChecklistSchema>;

export const UpdateChecklistSchema = z
	.object({
		title: z.string().min(1).max(200).optional(),
		description: z.string().max(2000).optional(),
		category: ChecklistCategory.optional(),
		is_public: z.number().int().min(0).max(1).optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided",
	});
export type UpdateChecklist = z.infer<typeof UpdateChecklistSchema>;

export const ListChecklistsQuerySchema = z.object({
	category: ChecklistCategory.optional(),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	offset: z.coerce.number().int().min(0).default(0),
});
export type ListChecklistsQuery = z.infer<typeof ListChecklistsQuerySchema>;

// --- Checklist Item ---

export const CreateChecklistItemSchema = z.object({
	title: z.string().min(1).max(200),
	product_url: z.string().url().max(2000).optional(),
	sort_order: z.number().int().min(0).default(0),
});
export type CreateChecklistItem = z.infer<typeof CreateChecklistItemSchema>;

export const UpdateChecklistItemSchema = z
	.object({
		title: z.string().min(1).max(200).optional(),
		product_url: z.string().url().max(2000).nullable().optional(),
		sort_order: z.number().int().min(0).optional(),
		is_checked: z.number().int().min(0).max(1).optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided",
	});
export type UpdateChecklistItem = z.infer<typeof UpdateChecklistItemSchema>;
