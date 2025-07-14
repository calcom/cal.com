import { z } from "zod";

export const ZListMembersInputSchema = z.object({
  teamId: z.number(),
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),
  searchTerm: z.string().optional(),
});

export type TListMembersInputSchema = z.infer<typeof ZListMembersInputSchema>;
