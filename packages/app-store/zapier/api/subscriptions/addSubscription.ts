import type { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { v4 } from "uuid";

import findValidApiKey from "@calcom/features/ee/api-keys/lib/findValidApiKey";
import { scheduleTrigger } from "@calcom/features/webhooks/lib/scheduleTrigger";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { BookingStatus, WebhookTriggerEvents } from "@calcom/prisma/enums";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.query.apiKey as string;

  if (!apiKey) {
    return res.status(401).json({ message: "No API key provided" });
  }

  const validKey = await findValidApiKey(apiKey, "zapier");

  if (!validKey) {
    return res.status(401).json({ message: "API key not valid" });
  }

  const { subscriberUrl, triggerEvent } = req.body;

  try {
    const createSubscription = await prisma.webhook.create({
      data: {
        id: v4(),
        userId: validKey.userId,
        teamId: validKey.teamId,
        eventTriggers: [triggerEvent],
        subscriberUrl,
        active: true,
        appId: "zapier",
      },
    });

    if (triggerEvent === WebhookTriggerEvents.MEETING_ENDED) {
      //schedule job for already existing bookings
      const where: Prisma.BookingWhereInput = {};
      if (validKey.teamId) where.eventType = { teamId: validKey.teamId };
      else where.userId = validKey.userId;
      const bookings = await prisma.booking.findMany({
        where: {
          ...where,
          startTime: {
            gte: new Date(),
          },
          status: BookingStatus.ACCEPTED,
        },
      });

      for (const booking of bookings) {
        scheduleTrigger(booking, createSubscription.subscriberUrl, {
          id: createSubscription.id,
          appId: createSubscription.appId,
        });
      }
    }
    res.status(200).json(createSubscription);
  } catch (error) {
    return res.status(500).json({ message: "Could not create subscription." });
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(handler) }),
});
