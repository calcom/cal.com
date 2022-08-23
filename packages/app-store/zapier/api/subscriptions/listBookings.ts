import type { NextApiRequest, NextApiResponse } from "next";

import findValidApiKey from "@calcom/features/ee/api-keys/lib/findValidApiKey";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.query.apiKey as string;

  if (!apiKey) {
    return res.status(401).json({ message: "No API key provided" });
  }

  const validKey = await findValidApiKey(apiKey, "zapier");

  if (!validKey) {
    return res.status(401).json({ message: "API key not valid" });
  }

  try {
    const bookings = await prisma.booking.findMany({
      take: 3,
      where: {
        userId: validKey.userId,
      },
      select: {
        ...bookingMinimalSelect,
        location: true,
        attendees: {
          select: {
            name: true,
            email: true,
            timeZone: true,
          },
        },
      },
    });

    res.status(201).json(bookings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to get bookings." });
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
