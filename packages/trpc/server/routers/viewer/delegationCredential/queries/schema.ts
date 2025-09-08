import { z } from "zod";

export const ZDelegationCredentialGetAffectedMembersForDisableSchema = z.object({
  credentialId: z.number(),
});

export type TDelegationCredentialGetAffectedMembersForDisableSchema = z.infer<
  typeof ZDelegationCredentialGetAffectedMembersForDisableSchema
>;
