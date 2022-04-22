import type { NextApiRequest, NextApiResponse } from "next";
import { v4 } from "uuid";

import prisma from "@lib/prisma";
import findValidApiKey from "@lib/zapier/findValidApiKey";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.query.apiKey as string;

  if (!apiKey) {
    return res.status(401).json({ message: "No API key provided" });
  }

  const validKey = await findValidApiKey(apiKey);

  if (!validKey) {
    return res.status(401).json({ message: "API key not valid" });
  }

  const { subscriberUrl, triggerEvent } = req.body;

  if (req.method === "POST") {
    try {
      const createSubscription = await prisma.webhook.create({
        data: {
          id: v4(),
          userId: validKey.userId,
          eventTriggers: [triggerEvent],
          subscriberUrl,
          active: true,
          isZapierSubscription: true,
        },
      });
      res.status(201).json(createSubscription);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Unable to create subscription." });
    }
  }
}
