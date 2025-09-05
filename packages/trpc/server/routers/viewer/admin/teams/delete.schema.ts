import { z } from "zod";

export const ZTeamDeleteSchema = z.object({
  teamId: z.number(),
});

export type TTeamDeleteSchema = z.infer<typeof ZTeamDeleteSchema>;
