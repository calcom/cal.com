import { serviceAccountKeySchema } from "@calcom/prisma/zod-utils";
import { z } from "zod";

export const DelegationCredentialCreateSchema = z.object({
  workspacePlatformSlug: z.string(),
  domain: z.string(),
  serviceAccountKey: serviceAccountKeySchema,
});

export const DelegationCredentialUpdateSchema = z.object({
  id: z.string(),
  workspacePlatformSlug: z.string(),
  domain: z.string(),
});

export const DelegationCredentialToggleEnabledSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
});

export const DelegationCredentialDeleteSchema = z.object({
  id: z.string(),
});

export const DelegationCredentialGetAffectedMembersForDisableSchema = z.object({
  id: z.string(),
});

export type TDelegationCredentialGetAffectedMembersForDisableSchema = z.infer<
  typeof DelegationCredentialGetAffectedMembersForDisableSchema
>;
