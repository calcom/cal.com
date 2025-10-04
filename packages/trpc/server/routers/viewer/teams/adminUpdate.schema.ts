import { z } from "zod";

export const ZAdminUpdateTeamSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  slug: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type TAdminUpdateTeam = z.infer<typeof ZAdminUpdateTeamSchema>;
