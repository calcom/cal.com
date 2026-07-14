import { z } from "zod";

export const ZListSchema = z.object({
  searchTerm: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.number().nullish(),
});

export type TListSchema = z.infer<typeof ZListSchema>;
