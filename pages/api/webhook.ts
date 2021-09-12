import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/prisma";
import { getSession } from "next-auth/client";

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

    // webhookEventTypes = webhooks.map((webhook)=>{
    //   const eventType = webhookEventTypes.find((webhookEventType)=>{webhook.id === webhookEventType.webhookId});
    //   return{
    //     ...webhook,
    //     eventTypes: eventType
    //   }
    // })

    return res.status(200).json({ webhooks: webhooks, webhookEventTypes: webhookEventTypes });
  }

  if (req.method === "POST") {
    const createWebhook = await prisma.webhook.create({
      data: {
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
    // await prisma.webhookEventTypes.create({
    //   data: {
    //     webhookId: createWebhook.id,
    //     eventTypeId: req.body.eventTypeId,
    //   },
    // });

    return res.status(201).json({ message: "Team created" });
  }

  res.status(404).json({ message: "Team not found" });
}
