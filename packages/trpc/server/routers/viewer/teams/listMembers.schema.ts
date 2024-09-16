import { z } from "zod";

export const ZListMembersInputSchema = z.object({
  teamIds: z.number().array().optional(),
  limit: z.number().default(10),
  searchTerm: z.string().optional(),
  cursor: z.number().optional().nullable(),
});

export type TListMembersInputSchema = z.infer<typeof ZListMembersInputSchema>;
