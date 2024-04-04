import { getEventTypesByViewer } from "@calcom/lib";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import { Prisma } from ".prisma/client";

type GlobalSettingsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const globalSettingsHandler = async ({ ctx }: GlobalSettingsOptions) => {
  const { user } = ctx;
  const userProfile = user.profile;
  const profile = await ProfileRepository.findByUpId(userProfile.upId);

  if (!profile) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  const commonSelect = {
    periodType: true,
    bookingLimits: true,
    periodCountCalendarDays: true,
    periodDays: true,
    periodStartDate: true,
    periodEndDate: true,
    minimumBookingNotice: true,
    beforeEventBuffer: true,
    afterEventBuffer: true,
  };
  const globalSettings = await prisma.globalSettings.findUnique({
    where: {
      userId: user.id,
    },
    select: commonSelect,
  });

  let whereClause: Prisma.EventTypeWhereInput = {};
  if (globalSettings?.bookingLimits) {
    whereClause = {
      OR: [
        {
          bookingLimits: { not: globalSettings.bookingLimits },
        },
        // For some reason, when the column doesnt have any value i.e., null, the records doesn't return
        {
          bookingLimits: { equals: Prisma.AnyNull },
        },
      ],
    };
  }
  const eventTypes = await getEventTypesByViewer(user, undefined, false, whereClause);

  return {
    globalSettings,
    eventCount: eventTypes.eventTypeGroups.reduce((acc, currValue) => acc + currValue.eventTypes.length, 0),
    eventTypeGroups: eventTypes.eventTypeGroups.filter(
      (eventTypeGroup) => eventTypeGroup.eventTypes.length > 0
    ),
  };
};
