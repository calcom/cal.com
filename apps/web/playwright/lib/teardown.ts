import type { Prisma } from "@prisma/client";

import prisma from "@calcom/prisma";

/**
 * @deprecated
 * DO NOT USE, since test run in parallel this will cause flaky tests. The reason
 * being that a set of test may end earlier than other trigger a delete of all bookings
 * than other tests may depend on them. The proper ettiquete should be that EACH test
 * should cleanup ONLY the booking that we're created in that specific test to se DB
 * remains "pristine" after each test
 */
export const deleteAllBookingsByEmail = async (
  email: string,
  whereConditional: Prisma.BookingWhereInput = {}
) =>
  prisma.booking.deleteMany({
    where: {
      user: {
        email,
      },
      ...whereConditional,
    },
  });

export const deleteEventTypeByTitle = async (title: string) => {
  const event = (await prisma.eventType.findFirst({
    select: { id: true },
    where: { title: title },
  }))!;
  await prisma.eventType.delete({ where: { id: event.id } });
};

export const deleteAllWebhooksByEmail = async (email: string) => {
  await prisma.webhook.deleteMany({
    where: {
      user: {
        email,
      },
    },
  });
};

export const deleteAllPaymentsByEmail = async (email: string) => {
  await prisma.payment.deleteMany({
    where: {
      booking: {
        user: {
          email,
        },
      },
    },
  });
};

export const deleteAllPaymentCredentialsByEmail = async (email: string) => {
  await prisma.user.update({
    where: {
      email,
    },
    data: {
      credentials: {
        deleteMany: {
          type: {
            endsWith: "_payment",
          },
        },
      },
    },
  });
};
