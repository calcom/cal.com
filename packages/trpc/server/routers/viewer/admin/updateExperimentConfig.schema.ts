import { z } from "zod";

export const ZUpdateExperimentConfigSchema = z.object({
  slug: z.string(),
  metadata: z.object({
    variants: z.array(
      z.object({
        name: z.string(),
        percentage: z.number().min(0).max(100),
      })
    ),
    assignmentType: z.enum(["DETERMINISTIC", "RANDOM"]),
    status: z.enum(["draft", "running", "paused", "concluded"]).optional(),
    winnerVariant: z.string().optional(),
  }),
});

export type TUpdateExperimentConfigSchema = z.infer<typeof ZUpdateExperimentConfigSchema>;
