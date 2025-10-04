import { z } from "zod";

export const ZAdminDeleteTeamSchema = z.object({
  id: z.number(),
});

export type TAdminDeleteTeam = z.infer<typeof ZAdminDeleteTeamSchema>;
