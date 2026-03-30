import { EXPERIMENT_STATUS } from "@calcom/features/experiments/types";
import { z } from "zod";

const manualStatuses = [
  EXPERIMENT_STATUS.DRAFT,
  EXPERIMENT_STATUS.RUNNING,
  EXPERIMENT_STATUS.STOPPED,
] as const;

export const ZExperimentsUpdateStatusSchema = z.object({
  slug: z.string(),
  status: z.enum(manualStatuses),
});

export type TExperimentsUpdateStatusSchema = z.infer<typeof ZExperimentsUpdateStatusSchema>;

export const ZExperimentsUpdateVariantWeightSchema = z.object({
  experimentSlug: z.string(),
  variantSlug: z.string(),
  weight: z.number().int().min(0).max(100),
});

export type TExperimentsUpdateVariantWeightSchema = z.infer<typeof ZExperimentsUpdateVariantWeightSchema>;

export const ZExperimentsSetWinnerSchema = z.object({
  slug: z.string(),
  variantSlug: z.string().nullable(),
});

export type TExperimentsSetWinnerSchema = z.infer<typeof ZExperimentsSetWinnerSchema>;
