import { z } from "zod";

export const ZGetTeamWithMinimalDataSchema = z.object({
  teamId: z.number(),
  isOrg: z.boolean().optional(),
});

export type TGetTeamWithMinimalDataInputSchema = z.infer<typeof ZGetTeamWithMinimalDataSchema>;
