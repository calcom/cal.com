import { z } from "zod";

export const ZAdminToggleFeatureFlagSchema = z.object({
  slug: z.string(),
  enabled: z.boolean(),
});

export type TAdminToggleFeatureFlagSchema = z.infer<typeof ZAdminToggleFeatureFlagSchema>;
