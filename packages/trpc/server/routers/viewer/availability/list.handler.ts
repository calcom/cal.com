import { AvailabilityRepository } from "@calcom/lib/server/repository/availability";

import type { TrpcSessionUser } from "../../../types";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listHandler = async ({ ctx }: ListOptions) => {
  const { user } = ctx;
  return AvailabilityRepository.listSchedules(user.id);
};
