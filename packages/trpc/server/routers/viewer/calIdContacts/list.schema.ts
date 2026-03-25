import { z } from "zod";

export const ZCalIdContactsListInputSchema = z.object({
  search: z.string().trim().optional(),
  sortBy: z.enum(["name", "email", "createdAt", "updatedAt"]).default("name"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
  limit: z.number().int().min(1).max(100).default(10),
  offset: z.number().int().min(0).default(0),
});

export type TCalIdContactsListInputSchema = z.infer<typeof ZCalIdContactsListInputSchema>;
