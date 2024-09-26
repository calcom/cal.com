import { z } from "zod";

export const ZTeamsAndUserProfilesQueryInputSchema = z
  .object({
    includeOrg: z.boolean().optional(),
  })
  .optional();

export type TTeamsAndUserProfilesQueryInputSchema = z.infer<typeof ZTeamsAndUserProfilesQueryInputSchema>;
