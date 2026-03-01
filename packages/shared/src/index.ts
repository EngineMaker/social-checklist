import { z } from "zod";

export const ItemStatus = z.enum(["open", "in_progress", "done", "closed"]);
export type ItemStatus = z.infer<typeof ItemStatus>;

export const CreateItemSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().min(1).max(5000),
});
export type CreateItem = z.infer<typeof CreateItemSchema>;

export const UpdateItemSchema = z
	.object({
		title: z.string().min(1).max(200).optional(),
		description: z.string().min(1).max(5000).optional(),
		status: ItemStatus.optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided",
	});
export type UpdateItem = z.infer<typeof UpdateItemSchema>;

export const ListItemsQuerySchema = z.object({
	status: ItemStatus.optional(),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	offset: z.coerce.number().int().min(0).default(0),
});
export type ListItemsQuery = z.infer<typeof ListItemsQuerySchema>;
