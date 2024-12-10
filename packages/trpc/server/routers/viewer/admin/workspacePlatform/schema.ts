import { z } from "zod";

import { serviceAccountKeySchema } from "@calcom/prisma/zod-utils";

export const workspacePlatformCreateSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  defaultServiceAccountKey: serviceAccountKeySchema,
  enabled: z.boolean().optional().default(true),
});

export const workspacePlatformUpdateSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  description: z.string().min(1),
});

export const workspacePlatformUpdateServiceAccountSchema = z.object({
  id: z.number(),
  defaultServiceAccountKey: serviceAccountKeySchema,
});

export const workspacePlatformToggleEnabledSchema = z.object({
  id: z.number(),
  enabled: z.boolean(),
});
