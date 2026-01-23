import type { Prisma } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type GetUniqueAttendeesCountOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getUniqueAttendeesCountHandler = async ({ ctx }: GetUniqueAttendeesCountOptions) => {
  const { user } = ctx;

  const userMetadata = user.metadata as { isProUser?: { firstYearClaimDate?: string } } | null;
  const firstYearClaimDate = userMetadata?.isProUser?.firstYearClaimDate;

  const whereClause: Prisma.BookingWhereInput = {
    userId: user.id,
    status: BookingStatus.ACCEPTED,
    ...(firstYearClaimDate && {
      createdAt: {
        gte: new Date(firstYearClaimDate),
      },
    }),
  };

  const bookings = await prisma.booking.findMany({
    where: whereClause,
    select: {
      id: true,
      attendees: {
        select: {
          email: true,
        },
      },
    },
  });

  const uniqueAttendeeEmails = new Set<string>();

  bookings.forEach((booking) => {
    booking.attendees.forEach((attendee) => {
      if (attendee.email && attendee.email.toLowerCase() !== user.email?.toLowerCase()) {
        uniqueAttendeeEmails.add(attendee.email.toLowerCase());
      }
    });
  });

  const uniqueCount = uniqueAttendeeEmails.size;
  const requiredCount = 3;

  return {
    uniqueAttendeesCount: uniqueCount,
    requiredCount,
    isEligible: uniqueCount >= requiredCount,
  };
};
