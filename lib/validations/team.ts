import { withValidation } from "next-validations";
import { z } from "zod";

import { _TeamModel as Team } from "@calcom/prisma/zod";

export const schemaTeamBaseBodyParams = Team.omit({ id: true }).partial();

const schemaTeamRequiredParams = z.object({});

export const schemaTeamBodyParams = schemaTeamBaseBodyParams.merge(schemaTeamRequiredParams);

export const schemaTeamPublic = Team.omit({});

export const withValidTeam = withValidation({
  schema: schemaTeamBodyParams,
  type: "Zod",
  mode: "body",
});
