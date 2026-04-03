import type { TGetVerifiedNumbersInputSchema } from "@calcom/features/ee/workflows/repositories/workflow-repository";
import { z } from "zod";

export const ZGetVerifiedNumbersInputSchema: z.ZodType<TGetVerifiedNumbersInputSchema> = z.object({
  teamId: z.number().optional(),
});

export type { TGetVerifiedNumbersInputSchema };
