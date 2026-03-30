import { getExperimentService } from "@calcom/features/experiments/di/ExperimentService.container";

import type { TrpcSessionUser } from "../../../../types";
import type { TExperimentsSetWinnerSchema } from "./experiments.schema";

type SetWinnerOptions = {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: TExperimentsSetWinnerSchema;
};

export const setWinnerHandler = async ({ ctx, input }: SetWinnerOptions) => {
  const service = getExperimentService();
  await service.setWinner({ ...input, userId: ctx.user.id });
  return { success: true };
};

export default setWinnerHandler;
