import { z } from "zod";

export const ZListTeamFeaturesSchema = z.object({
  orgId: z.number(),
});

export type TListTeamFeaturesSchema = z.infer<typeof ZListTeamFeaturesSchema>;
