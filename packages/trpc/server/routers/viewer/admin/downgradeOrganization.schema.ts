import { z } from "zod";

export const ZDowngradeOrganizationInputSchema = z.object({
  organizationId: z.number(),
  targetTeamIdForCredits: z.number().optional(),
});

export type TDowngradeOrganizationInputSchema = z.infer<typeof ZDowngradeOrganizationInputSchema>;
