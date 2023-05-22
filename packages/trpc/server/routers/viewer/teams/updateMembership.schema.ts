import { z } from "zod";

export const ZUpdateMembershipInputSchema = z.object({
  teamId: z.number(),
  memberId: z.number(),
  disableImpersonation: z.boolean(),
});

export type TUpdateMembershipInputSchema = z.infer<typeof ZUpdateMembershipInputSchema>;
