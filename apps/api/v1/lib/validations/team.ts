import { z } from "zod";

import { _TeamModel as Team } from "@calcom/prisma/zod";

export const schemaTeamBaseBodyParams = Team.omit({ id: true, createdAt: true }).partial({
  hideBranding: true,
  metadata: true,
  pendingPayment: true,
});

const schemaTeamRequiredParams = z.object({
  name: z.string().max(255),
});

export const schemaTeamBodyParams = schemaTeamBaseBodyParams.merge(schemaTeamRequiredParams).strict();

export const schemaTeamUpdateBodyParams = schemaTeamBodyParams.partial();

const schemaOwnerId = z.object({
  ownerId: z.number().optional(),
});

export const schemaTeamCreateBodyParams = schemaTeamBodyParams.merge(schemaOwnerId).strict();

export const schemaTeamReadPublic = Team.omit({});

export const schemaTeamsReadPublic = z.array(schemaTeamReadPublic);
