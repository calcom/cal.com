import { z } from "zod";

export const ZGetTeamFeaturesSchema = z.object({
  teamId: z.number(),
});

export type TGetTeamFeaturesSchema = z.infer<typeof ZGetTeamFeaturesSchema>;
