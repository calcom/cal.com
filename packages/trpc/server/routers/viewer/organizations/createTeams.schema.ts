import { z } from "zod";

export const ZCreateTeamsSchema = z.object({
  teamNames: z.string().array(),
  orgId: z.number(),
});

export type TCreateTeamsSchema = z.infer<typeof ZCreateTeamsSchema>;
