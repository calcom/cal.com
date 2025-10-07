import { z } from "zod";

export const ZAllTeamsListMembersInput = z.object({
  limit: z.number().default(25),
  searchQuery: z.string().optional(),
  paging: z.number().min(0).optional(),
});

export type ZAllTeamsListMembersInput = z.infer<typeof ZAllTeamsListMembersInput>;
