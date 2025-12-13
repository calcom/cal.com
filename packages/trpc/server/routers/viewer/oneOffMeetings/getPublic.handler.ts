import { TRPCError } from "@trpc/server";

import prisma from "@calcom/prisma";
import { OneOffMeetingStatus } from "@calcom/prisma/enums";

import type { TGetPublicOneOffMeetingInputSchema } from "./getPublic.schema";

type GetPublicHandlerOptions = {
  input: TGetPublicOneOffMeetingInputSchema;
};

export const getPublicHandler = async ({ input }: GetPublicHandlerOptions) => {
  const { linkHash } = input;

  const oneOffMeeting = await prisma.oneOffMeeting.findUnique({
    where: {
      linkHash,
    },
    select: {
      id: true,
      title: true,
      description: true,
      duration: true,
      location: true,
      timeZone: true,
      linkHash: true,
      status: true,
      offeredSlots: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
        },
        orderBy: {
          startTime: "asc",
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
          timeZone: true,
          weekStart: true,
        },
      },
    },
  });

  if (!oneOffMeeting) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "One-off meeting not found",
    });
  }

  // Check if the meeting is still active
  if (oneOffMeeting.status !== OneOffMeetingStatus.ACTIVE) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        oneOffMeeting.status === OneOffMeetingStatus.BOOKED
          ? "This meeting has already been booked"
          : oneOffMeeting.status === OneOffMeetingStatus.EXPIRED
            ? "This meeting link has expired"
            : "This meeting link is no longer available",
    });
  }

  // Filter out slots that are in the past
  const now = new Date();
  const availableSlots = oneOffMeeting.offeredSlots.filter((slot) => new Date(slot.startTime) > now);

  if (availableSlots.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "All time slots for this meeting have passed",
    });
  }

  return {
    ...oneOffMeeting,
    offeredSlots: availableSlots,
  };
};

