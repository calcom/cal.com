import { z } from "zod";

export const ZGetStatsSchema = z.object({
  teamId: z.number(),
});

export type TGetStatsSchema = z.infer<typeof ZGetStatsSchema>;
