import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";

import prisma from "@calcom/prisma";

import { authOptions } from "../auth/[...nextauth]";

interface NoShowHostData {
  date: string;
  count: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = session.user.id;

    // Get bookings for the last 30 days where the host didn't show up
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const noShowBookings = await prisma.booking.findMany({
      where: {
        userId: userId,
        startTime: {
          gte: thirtyDaysAgo,
        },
        status: "CANCELLED",
        cancellationReason: {
          contains: "no-show",
        },
      },
      select: {
        startTime: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    // Group by date and count
    const dataMap = new Map<string, number>();

    // Initialize all dates in the range with 0
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const dateStr = date.toISOString().split("T")[0];
      dataMap.set(dateStr, 0);
    }

    // Count no-shows per date
    noShowBookings.forEach((booking) => {
      const dateStr = booking.startTime.toISOString().split("T")[0];
      const currentCount = dataMap.get(dateStr) || 0;
      dataMap.set(dateStr, currentCount + 1);
    });

    // Convert to array format
    const data: NoShowHostData[] = Array.from(dataMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching no-show hosts data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}