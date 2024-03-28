import { z } from "zod";

export const ZCreateTeamsSchema = z.object({
  teamNames: z.string().array(),
  orgId: z.number(),
  moveTeams: z.array(
    z.object({
      id: z.number(),
      newSlug: z.string().nullable(),
      shouldMove: z.boolean(),
    })
  ),
});

export type TCreateTeamsSchema = z.infer<typeof ZCreateTeamsSchema>;
