import type { z } from "zod";

import { _FeatureModel } from "@calcom/prisma/zod/feature";

export const selectFeatureSchema = _FeatureModel;
export type Feature = z.infer<typeof selectFeatureSchema>;

export const insertFeatureSchema = _FeatureModel.pick({
  slug: true,
  enabled: true,
  description: true,
  type: true,
});

export type FeatureInsert = z.infer<typeof insertFeatureSchema>;
