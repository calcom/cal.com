import type { TGetVerifiedEmailsInputSchema } from "@calcom/features/ee/workflows/repositories/workflow-repository";
import { z } from "zod";

export const ZGetVerifiedEmailsInputSchema: z.ZodType<TGetVerifiedEmailsInputSchema> = z.object({
  teamId: z.number().optional(),
});

export type { TGetVerifiedEmailsInputSchema };
