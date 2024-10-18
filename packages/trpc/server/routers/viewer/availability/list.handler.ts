import { AvailabilityRepository } from "@calcom/lib/server/repository/availability";

import type { TrpcSessionUser } from "../../../trpc";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listHandler = async ({ ctx }: ListOptions) => {
  const { user } = ctx;

  return await AvailabilityRepository.getList({ userId: user.id, defaultScheduleId: user.defaultScheduleId });
};
