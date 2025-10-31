import type { Prisma } from "@prisma/client";

import prisma from "@calcom/prisma";

interface GetCSATDataParams {
  startDate: Date;
  endDate: Date;
  teamId?: number;
  userId?: number;
}

interface CSATDataPoint {
  date: string;
  averageScore: number;
  totalResponses: number;
  scores: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export async function getCSATData({
  startDate,
  endDate,
  teamId,
  userId,
}: GetCSATDataParams): Promise<CSATDataPoint[]> {
  const whereClause: Prisma.BookingWhereInput = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
    rating: {
      not: null,
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
      rating: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Group by date and calculate CSAT scores
  const dataByDate = new Map<
    string,
    {
      scores: number[];
      distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
    }
  >();

  bookings.forEach((booking) => {
    if (booking.rating === null) return;

    const dateKey = booking.createdAt.toISOString().split("T")[0];
    const current = dataByDate.get(dateKey) || {
      scores: [],
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };

    current.scores.push(booking.rating);
    if (booking.rating >= 1 && booking.rating <= 5) {
      current.distribution[booking.rating as 1 | 2 | 3 | 4 | 5] += 1;
    }

    dataByDate.set(dateKey, current);
  });

  // Convert to array format
  const result: CSATDataPoint[] = Array.from(dataByDate.entries()).map(([date, data]) => {
    const averageScore =
      data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0;

    return {
      date,
      averageScore: Math.round(averageScore * 100) / 100,
      totalResponses: data.scores.length,
      scores: data.distribution,
    };
  });

  return result;
}