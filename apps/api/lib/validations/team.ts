import { z } from "zod";

import { _TeamModel as Team } from "@calcom/prisma/zod";

export const schemaTeamBodyParams = Team.omit({ id: true, createdAt: true })
  .partial({
    hideBranding: true,
    metadata: true,
  })
  .extend({
    slug: z.string(),
    name: z.string(),
  })
  .strict();

export const schemaTeamUpdateBodyParams = schemaTeamBodyParams.partial();

export const schemaTeamCreateBodyParams = schemaTeamBodyParams
  .extend({
    ownerId: z.number().optional(),
  })
  .strict();

export const schemaTeamReadPublic = Team.omit({});

export const schemaTeamsReadPublic = z.array(schemaTeamReadPublic);
