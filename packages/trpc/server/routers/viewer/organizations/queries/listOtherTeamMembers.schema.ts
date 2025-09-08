import { z } from "zod";

export const ZListOtherTeamMembersSchema = z.object({
  teamId: z.number(),
  limit: z.number().min(1).max(100).nullish(),
  cursor: z.number().nullish(),
});

export type TListOtherTeamMembersSchema = z.infer<typeof ZListOtherTeamMembersSchema>;
