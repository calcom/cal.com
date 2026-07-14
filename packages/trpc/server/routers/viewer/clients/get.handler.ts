import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TGetSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetSchema;
};

export const get = async ({ ctx, input }: GetOptions) => {
  const { email } = input;

  const bookings = await prisma.booking.findMany({
    where: {
      userId: ctx.user.id,
      attendees: {
        some: {
          email: {
            equals: email,
            mode: "insensitive",
          },
        },
      },
    },
    select: {
      id: true,
      uid: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      status: true,
      createdAt: true,
      paid: true,
      eventType: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      attendees: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      payment: {
        select: {
          amount: true,
          currency: true,
          success: true,
          refunded: true,
        },
      },
    },
    orderBy: {
      startTime: "desc",
    },
  });

  const attendee = bookings
    .flatMap((b) => b.attendees)
    .find((a) => a.email.toLowerCase() === email.toLowerCase());

  const totalSpent = bookings.reduce((sum, b) => {
    return sum + b.payment.filter((p) => p.success).reduce((s, p) => s + p.amount, 0);
  }, 0);

  return {
    client: {
      email: attendee?.email ?? email,
      name: attendee?.name ?? email.split("@")[0],
      totalBookings: bookings.length,
      totalSpent,
    },
    bookings: bookings.map((b) => ({
      uid: b.uid,
      title: b.title,
      description: b.description,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      createdAt: b.createdAt,
      paid: b.paid,
      eventType: b.eventType,
      payment: b.payment,
    })),
  };
};
