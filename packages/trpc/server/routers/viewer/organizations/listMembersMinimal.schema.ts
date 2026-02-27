import { z } from "zod";

export const ZListMembersMinimalInputSchema = z.object({
  limit: z.number().min(1).max(50).default(20),
  cursor: z.number().nullish(),
  searchTerm: z.string().optional(),
});

export type TListMembersMinimalInput = z.infer<typeof ZListMembersMinimalInputSchema>;
