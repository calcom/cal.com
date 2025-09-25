import { z } from "zod";

export const ZGetCalidTeamSchema = z.object({
  teamId: z.number(),
});

export type ZGetCalidTeamInput = z.infer<typeof ZGetCalidTeamSchema>;
