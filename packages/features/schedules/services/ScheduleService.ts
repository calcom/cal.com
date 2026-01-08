import { getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { hasEditPermissionForUserID } from "@calcom/lib/hasEditPermissionForUser";
import { HttpError } from "@calcom/lib/http-error";
import { transformScheduleToAvailabilityForAtom } from "@calcom/lib/schedules/transformers/for-atom";
import type { PrismaClient } from "@calcom/prisma";
import type { TUpdateInputSchema } from "@calcom/trpc/server/routers/viewer/availability/schedule/update.schema";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { ScheduleRepository } from "../repositories/ScheduleRepository";

interface IUpdateScheduleOptions {
  input: TUpdateInputSchema;
  user: Pick<NonNullable<TrpcSessionUser>, "id" | "defaultScheduleId" | "timeZone">;
}

export type UpdateScheduleResponse = Awaited<ReturnType<ScheduleService["update"]>>;

export class ScheduleService {
  constructor(private prisma: PrismaClient) {}

  async update({ input, user }: IUpdateScheduleOptions) {
    const availability = input.schedule
      ? getAvailabilityFromSchedule(input.schedule)
      : (input.dateOverrides || []).map((dateOverride) => ({
          startTime: dateOverride.start,
          endTime: dateOverride.end,
          date: dateOverride.start,
          days: [],
        }));

    // Not able to update the schedule with userId where clause, so fetch schedule separately and then validate
    // Bug: https://github.com/prisma/prisma/issues/7290
    const userSchedule = await this.prisma.schedule.findUnique({
      where: {
        id: input.scheduleId,
      },
      select: {
        userId: true,
        name: true,
        id: true,
      },
    });

    if (!userSchedule) {
      throw new HttpError({
        statusCode: 401,
        message: "Unauthorized",
      });
    }

    if (userSchedule?.userId !== user.id) {
      const hasEditPermission = await hasEditPermissionForUserID({
        ctx: {
          user,
        },
        input: { memberId: userSchedule.userId },
      });
      if (!hasEditPermission) {
        throw new HttpError({
          statusCode: 401,
          message: "Unauthorized",
        });
      }
    }

    let updatedUser;
    if (input.isDefault) {
      const scheduleRepo = new ScheduleRepository(this.prisma);

      const setupDefault = await scheduleRepo.setupDefaultSchedule(user.id, input.scheduleId);
      updatedUser = setupDefault;
    }

    if (!input.name) {
      // TODO: Improve
      // We don't want to pass the full schedule for just a set as default update
      // but in the current logic, this wipes the existing availability.
      // Return early to prevent this from happening.
      return {
        schedule: userSchedule,
        isDefault: updatedUser
          ? updatedUser.defaultScheduleId === input.scheduleId
          : user.defaultScheduleId === input.scheduleId,
      };
    }

    const schedule = await this.prisma.schedule.update({
      where: {
        id: input.scheduleId,
      },
      data: {
        timeZone: input.timeZone,
        name: input.name,
        availability: {
          deleteMany: {
            scheduleId: {
              equals: input.scheduleId,
            },
          },
          createMany: {
            data: [
              ...availability,
              ...(input.dateOverrides || []).map((override) => ({
                date: override.start,
                startTime: override.start,
                endTime: override.end,
              })),
            ],
          },
        },
      },
      select: {
        id: true,
        userId: true,
        name: true,
        availability: true,
        timeZone: true,
        eventType: {
          select: {
            id: true,
            eventName: true,
          },
        },
      },
    });

    const userAvailability = transformScheduleToAvailabilityForAtom(schedule);

    return {
      schedule,
      availability: userAvailability,
      timeZone: schedule.timeZone || user.timeZone,
      isDefault: updatedUser
        ? updatedUser.defaultScheduleId === schedule.id
        : user.defaultScheduleId === schedule.id,
      prevDefaultId: user.defaultScheduleId,
      currentDefaultId: updatedUser ? updatedUser.defaultScheduleId : user.defaultScheduleId,
    };
  }
}

export const updateSchedule = async ({
  input,
  user,
  prisma,
}: IUpdateScheduleOptions & { prisma: PrismaClient }) => {
  const service = new ScheduleService(prisma);
  return service.update({ input, user });
};
