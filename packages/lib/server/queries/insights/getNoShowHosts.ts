import type { Prisma } from "@prisma/client";

import prisma from "@calcom/prisma";

interface GetNoShowHostsParams {
  startDate: Date;
  endDate: Date;
  teamId?: number;
  userId?: number;
}

interface NoShowHostDataPoint {
  date: string;
  noShowCount: number;
  totalBookings: number;
  noShowRate: number;
}

export async function getNoShowHosts({
  startDate,
  endDate,
  teamId,
  userId,
}: GetNoShowHostsParams): Promise<NoShowHostDataPoint[]> {
  const whereClause: Prisma.BookingWhereInput = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
    status: {
      in: ["ACCEPTED", "CANCELLED"],
    },
  };

  // Filter by team or user
  if (teamId) {
    whereClause.eventType = {
      teamId,
    };
  } else if (userId) {
    whereClause.userId = userId;
  }

  const bookings = await prisma.booking.findMany({
    where: whereClause,
    select: {
      id: true,
      createdAt: true,
      status: true,
      noShowHost: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Group by date and calculate no-show rates
  const dataByDate = new Map<string, { noShows: number; total: number }>();

  bookings.forEach((booking) => {
    const dateKey = booking.createdAt.toISOString().split("T")[0];
    const current = dataByDate.get(dateKey) || { noShows: 0, total: 0 };

    current.total += 1;
    if (booking.noShowHost) {
      current.noShows += 1;
    }

    dataByDate.set(dateKey, current);
  });

  // Convert to array format
  const result: NoShowHostDataPoint[] = Array.from(dataByDate.entries()).map(([date, data]) => ({
    date,
    noShowCount: data.noShows,
    totalBookings: data.total,
    noShowRate: data.total > 0 ? (data.noShows / data.total) * 100 : 0,
  }));

  return result;
}