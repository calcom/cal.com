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

const emailValidationCache = new Map<string, { isDisposable: boolean; timestamp: number }>();

const CACHE_TTL = 24 * 60 * 60 * 1000;

async function isTemporaryEmail(email: string): Promise<boolean> {
  const emailLower = email.toLowerCase().trim();

  const cached = emailValidationCache.get(emailLower);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.isDisposable;
  }

  try {
    const response = await fetch(`https://disify.com/api/email/${encodeURIComponent(emailLower)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      emailValidationCache.set(emailLower, {
        isDisposable: false,
        timestamp: Date.now(),
      });
      return false;
    }

    const data = (await response.json()) as { disposable?: boolean; format?: boolean };

    const isDisposable = data.disposable === true;

    emailValidationCache.set(emailLower, {
      isDisposable,
      timestamp: Date.now(),
    });

    return isDisposable;
  } catch (error) {
    emailValidationCache.set(emailLower, {
      isDisposable: false,
      timestamp: Date.now(),
    });
    return false;
  }
}

async function isValidAttendeeEmail(
  email: string | null | undefined,
  userEmail: string | null | undefined
): Promise<boolean> {
  if (!email || typeof email !== "string" || email.trim().length === 0) {
    return false;
  }

  const emailLower = email.toLowerCase().trim();
  if (userEmail && emailLower === userEmail.toLowerCase()) {
    return false;
  }

  if (!emailRegex.test(emailLower)) {
    return false;
  }

  const isDisposable = await isTemporaryEmail(emailLower);
  if (isDisposable) {
    return false;
  }

  return true;
}

export const getUniqueAttendeesCountHandler = async ({ ctx }: GetUniqueAttendeesCountOptions) => {
  const { user } = ctx;

  const userMetadata = user.metadata as {
    isProUser?: { firstYearClaimDate?: string; formSubmittedForYear?: number; yearClaimed?: number };
  } | null;
  const yearClaimed = userMetadata?.isProUser?.yearClaimed ?? 0;
  const firstYearClaimDate = userMetadata?.isProUser?.firstYearClaimDate;
  const formSubmittedForYear = userMetadata?.isProUser?.formSubmittedForYear ?? 0;

  if (formSubmittedForYear >= 2 || yearClaimed > 1) {
    return {
      uniqueAttendeesCount: 3,
      requiredCount: 3,
      isEligible: true,
    };
  }

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
