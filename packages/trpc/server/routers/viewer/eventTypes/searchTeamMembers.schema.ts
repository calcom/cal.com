import { z } from "zod";

export const ZSearchTeamMembersInputSchema = z.object({
  teamId: z.number(),
  cursor: z.number().nullish(),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  memberUserIds: z.array(z.number()).max(1000).optional(),
});

export type TSearchTeamMembersInputSchema = z.infer<typeof ZSearchTeamMembersInputSchema>;
