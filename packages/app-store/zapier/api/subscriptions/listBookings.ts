import type { NextApiRequest, NextApiResponse } from "next";

import findValidApiKey from "@calcom/features/ee/api-keys/lib/findValidApiKey";
import prisma from "@calcom/prisma";
import { integrationLocationToString } from "@lib/linkValueToString";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.query.apiKey as string;

  if (!apiKey) {
    return res.status(401).json({ message: "No API key provided" });
  }

  const validKey = await findValidApiKey(apiKey, "zapier");

  if (!validKey) {
    return res.status(401).json({ message: "API key not valid" });
  }

  if (req.method === "GET") {
    try {
      const bookings = await prisma.booking.findMany({
        take: 3,
        where: {
          userId: validKey.userId,
        },
        select: {
          title: true,
          description: true,
          customInputs: true,
          startTime: true,
          endTime: true,
          location: true,
          cancellationReason: true,
          status: true,
          eventType: {
            select: {
              title: true,
              description: true,
              requiresConfirmation: true,
              price: true,
              currency: true,
              length: true,
            }
          },
          attendees: {
            select: {
              name: true,
              email: true,
              timeZone: true,
            },
          },
        },
      });

      const updatedBookings = bookings.map(booking => {return { ...booking, location: integrationLocationToString(booking.location || "")}})

      res.status(201).json(updatedBookings);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Unable to get bookings." });
    }
  }
}
