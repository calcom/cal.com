import type { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import findValidApiKey from "@calcom/features/ee/api-keys/lib/findValidApiKey";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

const querySchema = z.object({
  apiKey: z.string(),
  id: z.string(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { apiKey, id } = querySchema.parse(req.query);

  if (!apiKey) {
    return res.status(401).json({ message: "No API key provided" });
  }

  const validKey = await findValidApiKey(apiKey, "zapier");

  if (!validKey) {
    return res.status(401).json({ message: "API key not valid" });
  }
  const webhook = await prisma.webhook.findFirst({
    where: {
      id,
      userId: validKey.userId,
      teamId: validKey.teamId,
    },
  });

  if (!webhook) {
    return res.status(401).json({ message: "Not authorized to delete this webhook" });
  }
  if (webhook?.eventTriggers.includes(WebhookTriggerEvents.MEETING_ENDED)) {
    const where: Prisma.BookingWhereInput = {};
    if (validKey.teamId) where.eventType = { teamId: validKey.teamId };
    else where.userId = validKey.userId;
    const bookingsWithScheduledJobs = await prisma.booking.findMany({
      where: {
        ...where,
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

  await prisma.webhook.delete({
    where: {
      id,
    },
  });
  res.status(204).json({ message: "Subscription is deleted." });
}

export default defaultHandler({
  DELETE: Promise.resolve({ default: defaultResponder(handler) }),
});
