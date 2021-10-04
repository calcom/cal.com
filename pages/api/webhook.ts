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

    return res.status(200).json({ webhooks: webhooks });
  }

  if (req.method === "POST") {
    const translator = short();
    const seed = `${req.body.subscriberUrl}:${dayjs(new Date()).utc().format()}`;
    const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));

    await prisma.webhook.create({
      data: {
        id: uid,
        userId: session.user.id,
        subscriberUrl: req.body.subscriberUrl,
        eventTriggers: req.body.eventTriggers,
      },
    });

    return res.status(201).json({ message: "Webhook created" });
  }

  res.status(404).json({ message: "Webhook not found" });
}
