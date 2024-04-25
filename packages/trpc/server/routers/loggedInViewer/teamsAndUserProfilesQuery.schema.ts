import { z } from "zod";

export const ZteamsAndUserProfilesQuerySchema = z
  .object({
    includeOrg: z.boolean().optional(),
  })
  .optional();

export type TteamsAndUserProfilesQuerySchema = z.infer<typeof ZteamsAndUserProfilesQuerySchema>;
