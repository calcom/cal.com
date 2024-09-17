import { z } from "zod";

export const workspacePlatformCreateSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  defaultServiceAccountKey: z.string(),
  enabled: z.boolean().optional().default(true),
});

export const workspacePlatformUpdateSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  description: z.string().min(1),
});

export const workspacePlatformUpdateServiceAccountSchema = z.object({
  id: z.number(),
  defaultServiceAccountKey: z.string(),
});

export const workspacePlatformToggleEnabledSchema = z.object({
  id: z.number(),
  enabled: z.boolean(),
});
