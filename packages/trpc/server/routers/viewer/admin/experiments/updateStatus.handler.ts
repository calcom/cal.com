import { getExperimentService } from "@calcom/features/experiments/di/ExperimentService.container";

import type { TrpcSessionUser } from "../../../../types";
import type { TExperimentsUpdateStatusSchema } from "./experiments.schema";

type UpdateStatusOptions = {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: TExperimentsUpdateStatusSchema;
};

export const updateStatusHandler = async ({ ctx, input }: UpdateStatusOptions) => {
  const service = getExperimentService();
  await service.updateStatus({ slug: input.slug, status: input.status, userId: ctx.user.id });
  return { success: true };
};

export default updateStatusHandler;
