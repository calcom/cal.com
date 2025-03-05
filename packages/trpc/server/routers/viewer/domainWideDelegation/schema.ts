import { z } from "zod";

import { serviceAccountKeySchema } from "@calcom/prisma/zod-utils";

export const DomainWideDelegationCreateSchema = z.object({
  workspacePlatformSlug: z.string(),
  domain: z.string(),
  serviceAccountKey: serviceAccountKeySchema,
});

export const DomainWideDelegationUpdateSchema = z.object({
  id: z.string(),
  workspacePlatformSlug: z.string(),
  domain: z.string(),
});

export const DomainWideDelegationToggleEnabledSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
});

export const DomainWideDelegationDeleteSchema = z.object({
  id: z.string(),
});
