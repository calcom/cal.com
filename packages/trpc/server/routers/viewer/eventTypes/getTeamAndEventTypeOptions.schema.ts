import { z } from "zod";

export const ZGetTeamAndEventTypeOptionsSchema = z
  .object({
    teamId: z.number().optional(),
    isOrg: z.boolean().default(false),
  })
  .nullish();

export type TGetTeamAndEventTypeOptionsSchema = z.infer<typeof ZGetTeamAndEventTypeOptionsSchema>;
