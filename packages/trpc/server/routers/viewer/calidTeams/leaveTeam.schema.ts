import { z } from "zod";

export const ZLeaveTeamSchema = z.object({
  teamId: z.number(),
});

export type ZLeaveTeamInput = z.infer<typeof ZLeaveTeamSchema>;