import { z } from "zod";

export const ZAddMembersToTeams = z.object({
  userIds: z.array(z.number()),
  teamIds: z.array(z.number()),
});

export type TAddMembersToTeams = z.infer<typeof ZAddMembersToTeams>;
