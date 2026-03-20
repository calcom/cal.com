import { z } from "zod";

export const ZMoveTeamToOrgSchema = z.object({
  teamId: z.number(),
  targetOrgId: z.number(),
  teamSlugInOrganization: z.string().min(1),
});

export type TMoveTeamToOrg = z.infer<typeof ZMoveTeamToOrgSchema>;
