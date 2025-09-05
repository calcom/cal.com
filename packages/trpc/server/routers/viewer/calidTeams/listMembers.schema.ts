import { z } from "zod";

export const ZListMembersSchema = z.object({
  teamId: z.number(),
  limit: z.number().default(25),
  searchQuery: z.string().optional(),
  paging: z.number().min(0).optional(),
});

export type ZListMembersInput = z.infer<typeof ZListMembersSchema>;
