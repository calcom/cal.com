import { z } from "zod";

export const ZLazyLoadMembersInputSchema = z.object({
  teamId: z.number(),
  limit: z.number().default(10),
  searchTerm: z.string().optional(),
  cursor: z.number().optional().nullable(),
});

export type TLazyLoadMembersInputSchema = z.infer<typeof ZLazyLoadMembersInputSchema>;
