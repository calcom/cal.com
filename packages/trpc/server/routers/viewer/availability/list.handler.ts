import { ScheduleRepository } from "@calcom/lib/server/repository/schedule";

import type { TrpcSessionUser } from "../../../trpc";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listHandler = async ({ ctx }: ListOptions) => {
  const { user } = ctx;
  return await ScheduleRepository.listSchedules(user.id, user.defaultScheduleId);
};
