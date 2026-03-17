import { getAbuseScoringRepository } from "@calcom/features/abuse-scoring/di/AbuseScoringRepository.container";

import type { TrpcSessionUser } from "../../../../types";
import type { TUpdateAbuseScoringConfigInputSchema } from "./config.schema";

export const getConfigHandler = async () => {
  const repository = getAbuseScoringRepository();
  return repository.findConfig();
};

type UpdateConfigOptions = {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: TUpdateAbuseScoringConfigInputSchema;
};

export const updateConfigHandler = async ({ ctx, input }: UpdateConfigOptions) => {
  const repository = getAbuseScoringRepository();
  return repository.updateConfig({
    alertThreshold: input.alertThreshold,
    lockThreshold: input.lockThreshold,
    monitoringWindowDays: input.monitoringWindowDays,
    updatedById: ctx.user.id,
  });
};
