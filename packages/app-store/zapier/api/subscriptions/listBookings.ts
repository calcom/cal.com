import type { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { getHumanReadableLocationValue } from "@calcom/core/location";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import findValidApiKey from "@calcom/features/ee/api-keys/lib/findValidApiKey";
import { defaultHandler, defaultResponder, getTranslation } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

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
    const where: Prisma.BookingWhereInput = {};
    if (validKey.teamId) {
      where.eventType = {
        OR: [{ teamId: validKey.teamId }, { parent: { teamId: validKey.teamId } }],
      };
    } else {
      where.userId = validKey.userId;
    }

    const bookings = await prisma.booking.findMany({
      take: 3,
      where,
      orderBy: {
        id: "desc",
      },
      select: {
        title: true,
        description: true,
        customInputs: true,
        responses: true,
        startTime: true,
        endTime: true,
        location: true,
        cancellationReason: true,
        status: true,
        user: {
          select: {
            username: true,
            name: true,
            email: true,
            timeZone: true,
            locale: true,
          },
        },
        eventType: {
          select: {
            title: true,
            description: true,
            requiresConfirmation: true,
            price: true,
            currency: true,
            length: true,
            bookingFields: true,
            team: true,
          },
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

    if (bookings.length === 0) {
      const requested = validKey.teamId ? "teamId: " + validKey.teamId : "userId: " + validKey.userId;
      return res.status(404).json({
        message: `There are no bookings to retrieve, please create a booking first. Requested: \`${requested}\``,
      });
    }

    const t = await getTranslation(bookings[0].user?.locale ?? "en", "common");

    const updatedBookings = bookings.map((booking) => {
      return {
        ...booking,
        ...getCalEventResponses({
          bookingFields: booking.eventType?.bookingFields ?? null,
          booking,
        }),
        location: getHumanReadableLocationValue(booking.location || "", t),
      };
    });

    res.status(201).json(updatedBookings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to get bookings." });
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
