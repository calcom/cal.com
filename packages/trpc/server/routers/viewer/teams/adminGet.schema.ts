import { z } from "zod";

export const ZAdminGetTeamSchema = z.object({
  id: z.number(),
});

export type TAdminGetTeam = z.infer<typeof ZAdminGetTeamSchema>;
