import { TRPCError } from "@trpc/server";

import prisma from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TGetOneOffMeetingInputSchema } from "./get.schema";

type GetHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetOneOffMeetingInputSchema;
};

export const getHandler = async ({ ctx, input }: GetHandlerOptions) => {
  const { id, linkHash } = input;

  if (!id && !linkHash) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Either id or linkHash must be provided",
    });
  }

  const oneOffMeeting = await prisma.oneOffMeeting.findFirst({
    where: {
      ...(id && { id }),
      ...(linkHash && { linkHash }),
      userId: ctx.user.id,
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
      createdAt: true,
      bookedAt: true,
      bookingId: true,
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
      booking: {
        select: {
          id: true,
          uid: true,
          title: true,
          startTime: true,
          endTime: true,
          status: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          avatarUrl: true,
          timeZone: true,
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

  return {
    ...oneOffMeeting,
    bookingLink: `/one-off/${oneOffMeeting.linkHash}`,
  };
};

