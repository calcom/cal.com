import { getExperimentService } from "@calcom/features/experiments/di/ExperimentService.container";

import type { TrpcSessionUser } from "../../../../types";
import type { TExperimentsUpdateVariantWeightSchema } from "./experiments.schema";

type UpdateVariantWeightOptions = {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: TExperimentsUpdateVariantWeightSchema;
};

export const updateVariantWeightHandler = async ({ ctx, input }: UpdateVariantWeightOptions) => {
  const service = getExperimentService();
  await service.updateVariantWeight({ ...input, userId: ctx.user.id });
  return { success: true };
};

export default updateVariantWeightHandler;
