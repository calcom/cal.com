import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";

import prisma from "@calcom/prisma";

import { authOptions } from "../auth/[...nextauth]";

interface CSATData {
  date: string;
  score: number;
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

    // Get feedback/ratings for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch bookings with feedback for the user
    const bookingsWithFeedback = await prisma.booking.findMany({
      where: {
        userId: userId,
        startTime: {
          gte: thirtyDaysAgo,
        },
        status: "ACCEPTED",
      },
      select: {
        startTime: true,
        rating: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    // Group by date and calculate average rating
    const dataMap = new Map<string, { total: number; count: number }>();

    // Initialize all dates in the range
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const dateStr = date.toISOString().split("T")[0];
      dataMap.set(dateStr, { total: 0, count: 0 });
    }

    // Aggregate ratings per date
    bookingsWithFeedback.forEach((booking) => {
      if (booking.rating !== null && booking.rating !== undefined) {
        const dateStr = booking.startTime.toISOString().split("T")[0];
        const current = dataMap.get(dateStr) || { total: 0, count: 0 };
        dataMap.set(dateStr, {
          total: current.total + booking.rating,
          count: current.count + 1,
        });
      }
    });

    // Convert to array format with average scores
    const data: CSATData[] = Array.from(dataMap.entries()).map(([date, { total, count }]) => ({
      date,
      score: count > 0 ? total / count : 0,
    }));

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching CSAT data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}