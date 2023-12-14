import { z } from "zod";

import { _TeamModel as Team } from "@calcom/prisma/zod";

export const schemaTeamBaseBodyParams = Team.omit({ id: true, createdAt: true }).partial({
  hideBranding: true,
  metadata: true,
});

const schemaTeamRequiredParams = z.object({});

export const schemaTeamBodyParams = schemaTeamBaseBodyParams.merge(schemaTeamRequiredParams).strict();

export const schemaTeamUpdateBodyParams = schemaTeamBodyParams.partial();

const schemaUserId = z.object({
  userId: z.number().optional(),
});

export const schemaTeamCreateBodyParams = schemaTeamBodyParams.merge(schemaUserId).strict();

export const schemaTeamReadPublic = Team.omit({});

export const schemaTeamsReadPublic = z.array(schemaTeamReadPublic);
