import { Prisma } from "@prisma/client";

import { getEventTypesByViewer } from "@calcom/lib";
import prisma from "@calcom/prisma";

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
  const globalSettings = await prisma.globalSettings.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      bookingLimits: true,
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
  }[] = [];
  eventTypes.eventTypeGroups.forEach((eventTypeGroup) => {
    eventTypeGroup.eventTypes.forEach((eventType) => {
      recordsToModifyQueue.push({
        id: eventType.id,
        bookingLimits: globalSettings?.bookingLimits,
      });
    });
  });
  await prisma.$transaction(async () => {
    for (const record of recordsToModifyQueue) {
      await prisma.eventType.update({
        where: {
          id: record.id,
        },
        data: {
          bookingLimits: record?.bookingLimits || Prisma.JsonNull,
        },
      });
    }
  });

  return {
    message: "Successfully modified the event types",
  };
};
