import { z } from "zod";

export const ZCalidListTeamAvailaiblityScheme = z.object({
  limit: z.number().min(1).max(100),
  cursor: z.number().nullish(),
  startDate: z.string(),
  endDate: z.string(),
  loggedInUsersTz: z.string(),
  calIdTeamId: z.number().optional(),
  searchString: z.string().toLowerCase().optional(),
});

export type TCalidListTeamAvailaiblityScheme = z.infer<typeof ZCalidListTeamAvailaiblityScheme>;
