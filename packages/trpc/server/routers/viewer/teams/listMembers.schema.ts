import { z } from "zod";

export const ZListMembersInputSchema = z.object({
  teamId: z.number(),
  limit: z.number().default(10),
  searchTerm: z.string().optional(),
  offset: z.number().default(0),
});

export type TListMembersInputSchema = z.infer<typeof ZListMembersInputSchema>;
