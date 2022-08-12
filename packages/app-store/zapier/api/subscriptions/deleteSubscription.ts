import type { NextApiRequest, NextApiResponse } from "next";

import findValidApiKey from "@calcom/features/ee/api-keys/lib/findValidApiKey";
import prisma from "@calcom/prisma";

import { WebhookTriggerEvents } from ".prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.query.apiKey as string;

  if (!apiKey) {
    return res.status(401).json({ message: "No API key provided" });
  }

  const validKey = await findValidApiKey(apiKey, "zapier");

  if (!validKey) {
    return res.status(401).json({ message: "API key not valid" });
  }

  const id = req.query.id as string;

  const webhook = await prisma.webhook.findFirst({
    where: {
      id,
    },
  });

  if (webhook?.eventTriggers.includes(WebhookTriggerEvents.MEETING_ENDED)) {
    const bookingsWithScheduledJobs = await prisma.booking.findMany({
      where: {
        userId: validKey.userId,
        scheduledJobs: {
          isEmpty: false,
        },
      },
    });
    for (const booking of bookingsWithScheduledJobs) {
      const updatedScheduledJobs = booking.scheduledJobs.filter(
        (scheduledJob) => scheduledJob !== `zapier_${webhook.id}`
      );
      await prisma.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          scheduledJobs: updatedScheduledJobs,
        },
      });
    }
  }

  if (req.method === "DELETE") {
    await prisma.webhook.delete({
      where: {
        id,
      },
    });
    res.status(204).json({ message: "Subscription is deleted." });
  }
}
