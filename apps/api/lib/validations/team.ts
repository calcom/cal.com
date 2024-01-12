import { z } from "zod";

import { _TeamModel as Team } from "@calcom/prisma/zod";

export const schemaTeamBaseBodyParams = Team.omit({ id: true, createdAt: true }).partial({
  hideBranding: true,
  metadata: true,
});

export const schemaTeamUpdateBodyParams = schemaTeamBaseBodyParams.partial();

export const schemaTeamCreateBodyParams = schemaTeamBaseBodyParams
  .extend({
    ownerId: z.number().optional(),
  })
  .strict();

export const schemaTeamReadPublic = Team.omit({});

export const schemaTeamsReadPublic = z.array(schemaTeamReadPublic);
