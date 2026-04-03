import { z } from "zod";

export const ZDeleteOrgOnboardingSchema = z.object({
  id: z.string(),
});

export type TDeleteOrgOnboardingSchema = z.infer<typeof ZDeleteOrgOnboardingSchema>;
