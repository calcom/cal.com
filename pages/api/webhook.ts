import dayjs from "dayjs";
import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/client";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });

  if (!session) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  // List webhooks
  if (req.method === "GET") {
    const webhooks = await prisma.webhook.findMany({
      where: {
        userId: session.user.id,
      },
    });

    const webhookEventTypes = await prisma.webhookEventTypes.findMany({
      where: {
        webhookId: {
          in: webhooks.map((webhook) => webhook.id),
        },
      },
    });

    const webhookEvents = await prisma.eventType.findMany({
      where: {
        id: {
          in: webhookEventTypes.map((event) => event.eventTypeId),
        },
      },
    });

    const filteredWebhookEvents = webhookEventTypes.map((eventType) => {
      return {
        webhookEvents: webhookEvents.filter((webhookEvent) => {
          return webhookEvent.id === eventType.eventTypeId;
        })[0],
        webhookId: eventType.webhookId,
      };
    });

    const webhookList = webhooks.map((webhook) => {
      return {
        ...webhook,
        webhookEvents: filteredWebhookEvents
          .filter((webhookEvent) => webhookEvent.webhookId === webhook.id)
          .map((event) => {
            return event.webhookEvents;
          }),
      };
    });

    return res.status(200).json({ webhooks: webhookList });
  }

  if (req.method === "POST") {
    const translator = short();
    const seed = `${req.body.subscriberUrl}:${dayjs(new Date()).utc().format()}`;
    const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));

    const createWebhook = await prisma.webhook.create({
      data: {
        uid: uid,
        userId: session.user.id,
        subscriberUrl: req.body.subscriberUrl,
        eventTriggers: req.body.eventTriggers,
      },
    });

    const webhookEventTypesData: { webhookId: number; eventTypeId: number }[] = [];
    await req.body.eventTypeId.forEach((ev: number) =>
      webhookEventTypesData.push({ webhookId: createWebhook.id, eventTypeId: ev })
    );

    await prisma.webhookEventTypes.createMany({
      data: webhookEventTypesData,
      skipDuplicates: true,
    });

    return res.status(201).json({ message: "Webhook created" });
  }

  res.status(404).json({ message: "Webhook not found" });
}
