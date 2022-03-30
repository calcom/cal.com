import { withValidation } from "next-validations";

import { _TeamModel as Team } from "@calcom/prisma/zod";

export const schemaTeamBodyParams = Team.omit({ id: true });

export const schemaTeamPublic = Team.omit({});

export const withValidTeam = withValidation({
  schema: schemaTeamBodyParams,
  type: "Zod",
  mode: "body",
});
