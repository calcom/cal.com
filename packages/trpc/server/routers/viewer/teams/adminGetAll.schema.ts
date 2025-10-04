import { z } from "zod";

export const ZAdminGetAllTeamsInputSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
  searchTerm: z.string().optional(),
  filters: z
    .array(
      z.object({
        id: z.string(),
        value: z.union([z.string(), z.array(z.string()), z.boolean()]),
      })
    )
    .optional(),
});

export type TAdminGetAllTeamsInput = z.infer<typeof ZAdminGetAllTeamsInputSchema>;
