import { z } from "zod";

export const ZListTeamAvailaiblityScheme = z.object({
  limit: z.number().min(1).max(100),
  cursor: z.number().nullish(),
  startDate: z.string(),
  endDate: z.string(),
  loggedInUsersTz: z.string(),
});

export type TListTeamAvailaiblityScheme = z.infer<typeof ZListTeamAvailaiblityScheme>;
