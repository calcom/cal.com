import { z } from "zod";

import { _TeamModel as Team } from "@calcom/prisma/zod";

export const schemaTeamBaseBodyParams = Team.omit({ id: true }).partial({ hideBranding: true });

const schemaTeamRequiredParams = z.object({});

export const schemaTeamBodyParams = schemaTeamBaseBodyParams.merge(schemaTeamRequiredParams).strict();

export const schemaTeamUpdateBodyParams = schemaTeamBodyParams.partial();

export const schemaTeamReadPublic = Team.omit({});

export const schemaTeamsReadPublic = z.array(schemaTeamReadPublic);
