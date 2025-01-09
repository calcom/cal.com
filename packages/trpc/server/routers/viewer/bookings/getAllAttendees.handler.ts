import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../trpc";
import type { TGetAllAttendeesInputSchema } from "./getAllAttendees.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetAllAttendeesInputSchema;
};

export const getAllAttendeesHandler = async ({ ctx, input }: GetOptions) => {
  const { prisma, user } = ctx;
  const { isOrgAdmin } = user.organization;
  const hasPermsToView = !user.organization.isPrivate || isOrgAdmin;

  if (!hasPermsToView) {
    return {
      attendees: [],
      nextCursor: undefined,
    };
  }

  const limit = input.limit ?? 10;
  const cursor = input.cursor ?? 0;

  // Query all attendees from bookings where the user is the booking owner

  const attendees = await prisma.attendee.findMany({
    where: {
      booking: {
        user: {
          id: user.id,
        },
      },
      email: input.searchText?.trim()?.length
        ? {
            contains: input.searchText,
            mode: "insensitive",
          }
        : undefined,
    },
  });

  // Use a Map to filter out duplicates based on email
  const distinctAttendees = Array.from(
    new Map(attendees.map((attendee) => [attendee.email, attendee])).values()
  );

  let nextCursor: typeof cursor | undefined = undefined;
  if (distinctAttendees.length > limit) {
    const nextItem = distinctAttendees.pop();
    nextCursor = nextItem?.id;
  }

  return { attendees: distinctAttendees, nextCursor };
};
