import { z } from "zod";

export type TUpdateMembershipInputSchema = {
  teamId: number;
  memberId: number;
  disableImpersonation: boolean;
};

export const ZUpdateMembershipInputSchema = z.object({
  teamId: z.number(),
  memberId: z.number(),
  disableImpersonation: z.boolean(),
});
