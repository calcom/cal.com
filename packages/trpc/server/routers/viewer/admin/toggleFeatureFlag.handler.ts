import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";
import type { FeatureId } from "@calcom/features/flags/config";

import type { TAdminToggleFeatureFlagSchema } from "./toggleFeatureFlag.schema";

type GetOptions = {
  ctx: {
    user: { id: number };
  };
  input: TAdminToggleFeatureFlagSchema;
};

export const toggleFeatureFlagHandler = async (opts: GetOptions) => {
  const { ctx, input } = opts;
  const { user } = ctx;
  const { slug, enabled } = input;
  const featureRepository = getFeatureRepository();
  return featureRepository.update({
    featureId: slug as FeatureId,
    enabled,
    updatedBy: user.id,
  });
};

export default toggleFeatureFlagHandler;
