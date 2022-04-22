import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@lib/prisma";
import findValidApiKey from "@lib/zapier/findValidApiKey";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.query.apiKey as string;

  if (!apiKey) {
    return res.status(401).json({ message: "No API key provided" });
  }

  const validKey = await findValidApiKey(apiKey);

  if (!validKey) {
    return res.status(401).json({ message: "API not valid" });
  }

  const subscriptionId = req.query.subscriptionId as string;

  if (req.method === "DELETE") {
    try {
      await prisma.webhook.delete({
        where: {
          id: subscriptionId,
        },
      });
      res.status(201).json({ message: "Subscription deleted." });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Unable to delete subscription." });
    }
  }
}
