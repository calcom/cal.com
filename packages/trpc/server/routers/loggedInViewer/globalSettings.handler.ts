// eslint-disable-next-line no-restricted-imports
import isEqual from "lodash/isEqual";

import { getEventTypesByViewer } from "@calcom/lib/event-types/getEventTypesByViewer";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

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

  const { eventTypeGroups } = await getEventTypesByViewer(user, undefined, false);
  let bookingFreqLimit = eventTypeGroups;
  if (globalSettings?.bookingLimits) {
    bookingFreqLimit = eventTypeGroups.map((eventTypeGroup) => ({
      ...eventTypeGroup,
      eventTypes: eventTypeGroup.eventTypes.filter(
        (eventType) =>
          !eventType?.bookingLimits || !isEqual(eventType.bookingLimits, globalSettings.bookingLimits)
      ),
    }));
  }

  const futureBookingEventTypeGroups = eventTypeGroups.map((eventTypeGroup) => ({
    ...eventTypeGroup,
    eventTypes: eventTypeGroup.eventTypes.filter(
      (eventType) =>
        eventType?.periodType !== globalSettings?.periodType ||
        eventType?.periodCountCalendarDays !== globalSettings?.periodCountCalendarDays ||
        eventType?.periodDays !== globalSettings?.periodDays ||
        eventType?.periodStartDate?.toString() !== globalSettings?.periodStartDate?.toString() ||
        eventType?.periodEndDate?.toString() !== globalSettings?.periodEndDate?.toString() ||
        eventType?.minimumBookingNotice !== globalSettings?.minimumBookingNotice ||
        eventType?.beforeEventBuffer !== globalSettings?.beforeEventBuffer ||
        eventType?.afterEventBuffer !== globalSettings?.afterEventBuffer
    ),
  }));

  return {
    globalSettings,
    bookingFreqLimitCount: bookingFreqLimit.reduce((acc, currValue) => acc + currValue.eventTypes.length, 0),
    bookingFreqEventTypeGroups: bookingFreqLimit.filter(
      (eventTypeGroup) => eventTypeGroup.eventTypes.length > 0
    ),
    futureBookingEventTypeGroups: futureBookingEventTypeGroups.filter(
      (eventTypeGroup) => eventTypeGroup.eventTypes.length > 0
    ),
    futureBookingLimitsCount: futureBookingEventTypeGroups.reduce(
      (acc, currValue) => acc + currValue.eventTypes.length,
      0
    ),
  };
};
