import { z } from "zod";

export const ZAddBulkMembersToTeams = z.object({
  userIds: z.array(z.number()),
  teamIds: z.array(z.number()),
});

export type TAddBulkMembersToTeams = z.infer<typeof ZAddBulkMembersToTeams>;
