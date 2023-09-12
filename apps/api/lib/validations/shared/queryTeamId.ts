import { withValidation } from "next-validations";
import { z } from "zod";

import { baseApiParams } from "./baseApiParams";

// Extracted out as utility function so can be reused
// at different endpoints that require this validation.
export const schemaQueryTeamId = baseApiParams
  .extend({
    teamId: z
      .string()
      .regex(/^\d+$/)
      .transform((id) => parseInt(id)),
  })
  .strict();

export const withValidQueryTeamId = withValidation({
  schema: schemaQueryTeamId,
  type: "Zod",
  mode: "query",
});
