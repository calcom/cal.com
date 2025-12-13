import prisma from "@calcom/prisma";
import type { OneOffMeetingStatus } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../types";
import type { TListOneOffMeetingsInputSchema } from "./list.schema";

type ListHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListOneOffMeetingsInputSchema;
};

export const listHandler = async ({ ctx, input }: ListHandlerOptions) => {
  const limit = input?.limit ?? 50;
  const cursor = input?.cursor;
  const status = input?.status as OneOffMeetingStatus | undefined;

  const oneOffMeetings = await prisma.oneOffMeeting.findMany({
    where: {
      userId: ctx.user.id,
      ...(status && { status }),
    },
    select: {
      id: true,
      title: true,
      description: true,
      duration: true,
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
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  let nextCursor: string | undefined = undefined;
  if (oneOffMeetings.length > limit) {
    const nextItem = oneOffMeetings.pop();
    nextCursor = nextItem?.id;
  }

  return {
    items: oneOffMeetings.map((meeting) => ({
      ...meeting,
      bookingLink: `/one-off/${meeting.linkHash}`,
    })),
    nextCursor,
  };
};

