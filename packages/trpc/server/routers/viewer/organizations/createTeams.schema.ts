import { z } from "zod";

import { CreationSource } from "@calcom/prisma/enums";

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
  creationSource: z.nativeEnum(CreationSource),
});

export type TCreateTeamsSchema = z.infer<typeof ZCreateTeamsSchema>;
