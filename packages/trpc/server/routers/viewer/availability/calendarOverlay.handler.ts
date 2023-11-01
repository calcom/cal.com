import { getBusyCalendarTimes } from "@calcom/core/CalendarManager";
import dayjs from "@calcom/dayjs";
import { prisma } from "@calcom/prisma";
import type { EventBusyDate } from "@calcom/types/Calendar";

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
  const { calendarsToLoad, dateFrom, dateTo } = input;

  if (!dateFrom || !dateTo) {
    return [] as EventBusyDate[];
  }

  // get all unique credentialIds from calendarsToLoad
  const uniqueCredentialIds = Array.from(new Set(calendarsToLoad.map((item) => item.credentialId)));

  // To call getCalendar we need

  // Ensure that the user has access to all of the credentialIds
  const credentials = await prisma.credential.findMany({
    where: {
      id: {
        in: uniqueCredentialIds,
      },
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

  if (credentials.length !== uniqueCredentialIds.length) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized - These credentials do not belong to you",
    });
  }

  const composedSelectedCalendars = calendarsToLoad.map((calendar) => {
    const credential = credentials.find((item) => item.id === calendar.credentialId);
    if (!credential) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Unauthorized - These credentials do not belong to you",
      });
    }
    return {
      ...calendar,
      userId: user.id,
      integration: credential.type,
    };
  });

  // get all clanedar services
  const calendarBusyTimes = await getBusyCalendarTimes(
    "",
    credentials,
    dateFrom,
    dateTo,
    composedSelectedCalendars
  );

  // Convert to users timezone

  const userTimeZone = input.loggedInUsersTz;
  const calendarBusyTimesConverted = calendarBusyTimes.map((busyTime) => {
    const busyTimeStart = dayjs(busyTime.start);
    const busyTimeEnd = dayjs(busyTime.end);
    const busyTimeStartDate = busyTimeStart.tz(userTimeZone).toDate();
    const busyTimeEndDate = busyTimeEnd.tz(userTimeZone).toDate();

    return {
      ...busyTime,
      start: busyTimeStartDate,
      end: busyTimeEndDate,
    } as EventBusyDate;
  });

  return calendarBusyTimesConverted;
};
