import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });
  const userId = session?.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // GET /api/webhook/{hook}
  const webhook = await prisma.webhook.findFirst({
    where: {
      id: String(req.query.hook),
      userId,
    },
  });
  if (!webhook) {
    return res.status(404).json({ message: "Invalid Webhook" });
  }
  if (req.method === "GET") {
    return res.status(200).json({ webhook });
  }

  // DELETE /api/webhook/{hook}
  if (req.method === "DELETE") {
    await prisma.webhook.delete({
      where: {
        id: String(req.query.hook),
      },
    });
    return res.status(200).json({});
  }

  if (req.method === "PATCH") {
    await prisma.webhook.update({
      where: {
        id: webhook.id,
      },
      data: {
        subscriberUrl: req.body.subscriberUrl,
        eventTriggers: req.body.eventTriggers,
        active: req.body.enabled,
      },
    });

    return res.status(200).json({ message: "Webhook updated successfully" });
  }
}
