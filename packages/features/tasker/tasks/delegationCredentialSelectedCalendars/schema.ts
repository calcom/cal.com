import { z } from "zod";

export const ZDelegationCredentialSelectedCalendarsPayloadSchema = z.object({
  delegationCredentialId: z.string(),
  lastMembershipId: z.number().optional(),
});

export type TDelegationCredentialSelectedCalendarsSchema = z.infer<
  typeof ZDelegationCredentialSelectedCalendarsPayloadSchema
>;
