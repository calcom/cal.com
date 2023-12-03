import { getEventsByKeywords } from "@calcom/core/CalendarManager";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCalendarOverlayInputSchema } from "./calendarOverlay.schema";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalendarOverlayInputSchema;
};

export const calendarOverlayHandler = async ({ ctx, input }: ListOptions) => {
  const { user } = ctx;

  // To call getCalendar we need

  // Ensure that the user has access to all of the credentialIds
  const credentials = await prisma.credential.findMany({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      type: true,
      key: true,
      userId: true,
      teamId: true,
      appId: true,
      invalid: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (false) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized - These credentials do not belong to you",
    });
  }

  // get all clanedar services
  const calendarBusyTimes = await getEventsByKeywords("", credentials);

  return calendarBusyTimes;

  // Convert to users timezone

  // const userTimeZone = input.loggedInUsersTz;
  // const calendarBusyTimesConverted = calendarBusyTimes.map((busyTime) => {
  //   const busyTimeStart = dayjs(busyTime.start);
  //   const busyTimeEnd = dayjs(busyTime.end);
  //   const busyTimeStartDate = busyTimeStart.tz(userTimeZone).toDate();
  //   const busyTimeEndDate = busyTimeEnd.tz(userTimeZone).toDate();

  //   return {
  //     ...busyTime,
  //     start: busyTimeStartDate,
  //     end: busyTimeEndDate,
  //     events: events,
  //   } as EventBusyDate;
  // });

  // return calendarBusyTimesConverted;
};
