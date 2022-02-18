import type { NextApiRequest, NextApiResponse } from "next";
import { v4 } from "uuid";

import { WebhookTriggerEvents } from "@calcom/prisma/client";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });

  if (!session) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (!session.user?.id) {
    console.error("Session is missing a user id");
    return res.status(500).json({ message: "Something went wrong" });
  }

  if (req.method === "GET") {
    const webhooks = await prisma.webhook.findMany({
      where: {
        eventTypeId: req.body.eventTypeId,
      },
      select: {
        id: true,
        subscriberUrl: true,
        payloadTemplate: true,
        active: true,
        eventTriggers: true,
      },
    });

    return res.status(200).json({ message: "Webhooks.", data: webhooks });
  }

  if (req.method === "POST") {
    await prisma.webhook.create({
      data: {
        id: v4(),
        subscriberUrl: req.body.subscriberUrl as string,
        eventTypeId: parseInt(req.body.eventTypeId as string),
        active: req.body.active as boolean,
        eventTriggers: req.body.eventTriggers as WebhookTriggerEvents[],
      },
    });

    const webhooks = await prisma.webhook.findMany({
      where: {
        eventTypeId: req.body.eventTypeId,
      },
      select: {
        id: true,
        subscriberUrl: true,
        payloadTemplate: true,
        active: true,
        eventTriggers: true,
      },
    });
    return res.status(200).json({ message: "Webhooks.", data: webhooks });
  }

  if (req.method === "DELETE") {
    await prisma.webhook.delete({
      where: {
        id: req.body.webhookId,
      },
    });

    const webhooks = await prisma.webhook.findMany({
      where: {
        eventTypeId: req.body.eventTypeId,
      },
      select: {
        id: true,
        subscriberUrl: true,
        payloadTemplate: true,
        active: true,
        eventTriggers: true,
      },
    });
    return res.status(200).json({ message: "Webhooks.", data: webhooks });
  }
}
