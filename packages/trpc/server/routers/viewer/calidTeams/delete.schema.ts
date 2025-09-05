import { z } from "zod";

export const ZDeleteCalidTeamSchema = z.object({
  teamId: z.number(),
});

export type ZDeleteCalidTeamInput = z.infer<typeof ZDeleteCalidTeamSchema>;
