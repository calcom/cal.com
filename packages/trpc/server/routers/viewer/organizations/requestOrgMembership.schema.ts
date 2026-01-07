import { z } from "zod";

export const ZRequestOrgMembershipInputSchema = z.object({
  orgId: z.number(),
});

export type TRequestOrgMembershipInputSchema = z.infer<typeof ZRequestOrgMembershipInputSchema>;
