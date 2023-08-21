import { z } from "zod";

export const ZAddBulkTeams = z.object({
  userIds: z.array(z.number()),
  teamIds: z.array(z.number()),
});

export type TAddBulkTeams = z.infer<typeof ZAddBulkTeams>;
