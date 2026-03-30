import { z } from "zod";

const ExperimentStatusSchema = z.enum(["DRAFT", "RUNNING", "STOPPED", "ROLLED_OUT"]);

export const EXPERIMENT_STATUS = {
  DRAFT: "DRAFT",
  RUNNING: "RUNNING",
  STOPPED: "STOPPED",
  ROLLED_OUT: "ROLLED_OUT",
} as const;

export type ExperimentStatusType = (typeof EXPERIMENT_STATUS)[keyof typeof EXPERIMENT_STATUS];

export const ExperimentVariantSchema = z.object({
  variantSlug: z.string(),
  label: z.string().nullable(),
  weight: z.number(),
});

export const ExperimentWithVariantsSchema = z.object({
  slug: z.string(),
  label: z.string().nullable(),
  description: z.string().nullable(),
  status: ExperimentStatusSchema,
  winner: z.string().nullable(),
  variants: z.array(ExperimentVariantSchema),
});

export const ExperimentWithVariantsArraySchema = z.array(ExperimentWithVariantsSchema);
