import { z } from "zod";

export const ZGetPublicCalidTeamInputSchema = z.object({
  teamSlug: z.string(),
});

export type TGetPublicCalidTeamInputSchema = z.infer<typeof ZGetPublicCalidTeamInputSchema>;
