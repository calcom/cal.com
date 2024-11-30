import { ScheduleRepository } from "@calcom/lib/server/repository/schedule";

import type { TrpcSessionUser } from "../../../../trpc";
import type { TGetAllByUserIdInputSchema } from "./getAllSchedulesByUserId.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetAllByUserIdInputSchema;
};

export const getAllSchedulesByUserIdHandler = async ({ ctx, input }: GetOptions) => {
  const { user } = ctx;

  const schedules = await ScheduleRepository.getAllDetailedScheduleByUserId({
    timeZone: user.timeZone,
    currentUserId: user.id,
    userIdOfSchedulesToGet: input.userId,
  });

  return schedules;
};
