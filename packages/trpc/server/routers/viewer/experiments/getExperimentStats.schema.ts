import { z } from "zod";

export const ZGetExperimentStatsSchema = z.object({
  experimentSlug: z.string(),
});

export type TGetExperimentStatsSchema = z.infer<typeof ZGetExperimentStatsSchema>;
