import { z } from "zod";

export const ZValidateDowngradeInputSchema = z.object({
  organizationId: z.number(),
});

export type TValidateDowngradeInputSchema = z.infer<typeof ZValidateDowngradeInputSchema>;
