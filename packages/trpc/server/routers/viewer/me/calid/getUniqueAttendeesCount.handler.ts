import dns from "dns/promises";

import { emailRegex } from "@calcom/lib/emailSchema";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type GetUniqueAttendeesCountOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

const mxCache = new Map<string, boolean>();

async function isValidDomain(email: string): Promise<boolean> {
  const emailDomain = email.split("@")[1].toLowerCase();
  if (!emailDomain) return false;

  if (mxCache.has(emailDomain)) {
    return mxCache.get(emailDomain)!;
  }

  try {
    const mx = await dns.resolveMx(emailDomain);
    const valid = mx.length > 0;
    mxCache.set(emailDomain, valid);
    return valid;
  } catch {
    mxCache.set(emailDomain, false);
    return false;
  }
}

async function isValidAttendeeEmail(
  email: string | null | undefined,
  userEmail: string | null | undefined
): Promise<boolean> {
  if (!email || typeof email !== "string") {
    return false;
  }

  const emailLower = email.toLowerCase().trim();
  if (userEmail && emailLower === userEmail.toLowerCase()) {
    return false;
  }

  if (!emailRegex.test(emailLower)) {
    return false;
  }

  const isValidEmailDomain = await isValidDomain(emailLower);
  if (!isValidEmailDomain) {
    return false;
  }

  return true;
}

export const getUniqueAttendeesCountHandler = async ({ ctx }: GetUniqueAttendeesCountOptions) => {
  const { user } = ctx;

  const userMetadata = user.metadata as {
    isProUser?: { claimDate?: string; claimSubmittedForYear?: number; yearClaimed?: number };
  } | null;
  const yearClaimed = userMetadata?.isProUser?.yearClaimed ?? 0;
  const claimDate = userMetadata?.isProUser?.claimDate;
  const claimSubmittedForYear = userMetadata?.isProUser?.claimSubmittedForYear ?? 0;

  if (claimSubmittedForYear >= 2 || yearClaimed > 1) {
    return {
      uniqueAttendeesCount: 3,
      requiredCount: 3,
      isEligible: true,
    };
  }

  const whereClause: Prisma.BookingWhereInput = {
    userId: user.id,
    status: BookingStatus.ACCEPTED,
    ...(claimDate && {
      createdAt: {
        gte: new Date(claimDate),
      },
    }),
  };

  const bookings = await prisma.booking.findMany({
    where: whereClause,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
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

  const emailValidationPromises = bookings.flatMap((booking) =>
    booking.attendees.map(async (attendee) => {
      if ((await isValidAttendeeEmail(attendee.email, user.email)) && attendee.email) {
        uniqueAttendeeEmails.add(attendee.email.toLowerCase().trim());
      }
    })
  );

  await Promise.all(emailValidationPromises);

  const uniqueCount = uniqueAttendeeEmails.size;
  const requiredCount = 3;

  return {
    uniqueAttendeesCount: uniqueCount,
    requiredCount,
    isEligible: uniqueCount >= requiredCount,
  };
};
