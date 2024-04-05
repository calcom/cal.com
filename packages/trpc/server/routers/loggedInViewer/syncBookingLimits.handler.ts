import type { Prisma } from "@prisma/client";

import { getEventTypesByViewer } from "@calcom/lib";
import prisma from "@calcom/prisma";
import type { PeriodType } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../trpc";
import type { TSyncBookingLimitsInputSchema } from "./syncBookingLimits.schema";

type SyncBookingLimitsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSyncBookingLimitsInputSchema;
};

export const syncBookingLimitsHandler = async ({ ctx, input }: SyncBookingLimitsOptions) => {
  const { user } = ctx;
  const isFuture = !!input?.isFuture;
  const globalSettings = await prisma.globalSettings.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      bookingLimits: true,
      periodType: true,
      periodCountCalendarDays: true,
      periodDays: true,
      periodStartDate: true,
      periodEndDate: true,
      minimumBookingNotice: true,
      beforeEventBuffer: true,
      afterEventBuffer: true,
    },
  });
  const eventTypes = await getEventTypesByViewer(user, undefined, false, {
    id: {
      in: input.eventIds,
    },
  });

  const recordsToModifyQueue: {
    id: number;
    bookingLimits: Prisma.JsonValue | undefined;
    periodType: PeriodType;
    periodCountCalendarDays: boolean | null;
    periodDays: number | null;
    periodStartDate: string | null;
    periodEndDate: string | null;
    minimumBookingNotice: number;
    beforeEventBuffer: number;
    afterEventBuffer: number;
  }[] = [];
  eventTypes.eventTypeGroups.forEach((eventTypeGroup) => {
    eventTypeGroup.eventTypes.forEach((eventType) => {
      recordsToModifyQueue.push({
        id: eventType.id,
        bookingLimits: isFuture ? eventType.bookingLimits : globalSettings?.bookingLimits,
        periodType: isFuture ? globalSettings?.periodType : eventType?.periodType,
        periodCountCalendarDays: isFuture
          ? globalSettings?.periodCountCalendarDays
          : eventType?.periodCountCalendarDays,
        periodDays: isFuture ? globalSettings?.periodDays : eventType?.periodDays,
        periodStartDate: isFuture ? globalSettings?.periodStartDate : eventType?.periodStartDate,
        periodEndDate: isFuture ? globalSettings?.periodEndDate : eventType?.periodEndDate,
        minimumBookingNotice: isFuture
          ? globalSettings?.minimumBookingNotice
          : eventType?.minimumBookingNotice,
        beforeEventBuffer: isFuture ? globalSettings?.beforeEventBuffer : eventType?.beforeEventBuffer,
        afterEventBuffer: isFuture ? globalSettings?.afterEventBuffer : eventType?.afterEventBuffer,
      });
    });
  });
  await prisma.$transaction(async () => {
    for (const record of recordsToModifyQueue) {
      await prisma.eventType.update({
        where: {
          id: record.id,
        },
        data: record,
      });
    }
  });

  return {
    message: "Successfully modified the event types",
  };
};
