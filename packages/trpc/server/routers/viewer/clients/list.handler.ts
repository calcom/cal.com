import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { TListSchema } from "./list.schema";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListSchema;
};

export const list = async ({ ctx, input }: ListOptions) => {
  const { searchTerm, limit, cursor } = input;

  const whereBase = {
    userId: ctx.user.id,
  } as const;

  const attendeesRaw = await prisma.attendee.findMany({
    where: {
      booking: {
        ...whereBase,
      },
      ...(searchTerm
        ? {
            OR: [
              { email: { contains: searchTerm, mode: "insensitive" } },
              { name: { contains: searchTerm, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      email: true,
      name: true,
      bookingId: true,
      booking: {
        select: {
          id: true,
          createdAt: true,
          startTime: true,
          paid: true,
          payment: {
            select: {
              amount: true,
              currency: true,
              success: true,
            },
          },
        },
      },
    },
    orderBy: {
      booking: {
        startTime: "desc",
      },
    },
  });

  const grouped = new Map<
    string,
    {
      email: string;
      name: string;
      totalBookings: number;
      totalSpent: number;
      currency: string;
      lastBookingAt: Date;
      firstBookingAt: Date;
    }
  >();

  for (const attendee of attendeesRaw) {
    if (!attendee.booking) continue;

    const email = attendee.email.toLowerCase();
    const existing = grouped.get(email);

    const spent = attendee.booking.payment.filter((p) => p.success).reduce((sum, p) => sum + p.amount, 0);
    const currency = attendee.booking.payment.find((p) => p.success)?.currency ?? "usd";
    const startTime = attendee.booking.startTime;

    if (existing) {
      existing.totalBookings += 1;
      existing.totalSpent += spent;
      if (startTime > existing.lastBookingAt) {
        existing.lastBookingAt = startTime;
      }
      if (startTime < existing.firstBookingAt) {
        existing.firstBookingAt = startTime;
      }
      if (!existing.name && attendee.name) {
        existing.name = attendee.name;
      }
    } else {
      grouped.set(email, {
        email: attendee.email,
        name: attendee.name || email.split("@")[0],
        totalBookings: 1,
        totalSpent: spent,
        currency,
        lastBookingAt: startTime,
        firstBookingAt: startTime,
      });
    }
  }

  const allClients = Array.from(grouped.values()).sort(
    (a, b) => b.lastBookingAt.getTime() - a.lastBookingAt.getTime()
  );

  let nextCursor: number | undefined;
  const startIndex = cursor ?? 0;
  const paginatedClients = allClients.slice(startIndex, startIndex + limit);
  if (startIndex + limit < allClients.length) {
    nextCursor = startIndex + limit;
  }

  return {
    clients: paginatedClients,
    nextCursor,
    total: allClients.length,
  };
};
