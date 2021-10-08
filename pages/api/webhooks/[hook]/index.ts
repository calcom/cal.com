import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/client";

import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });
  if (!session) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // GET /api/webhook/{hook}
  const webhooks = await prisma.webhook.findFirst({
    where: {
      id: String(req.query.hook),
      userId: session.user.id,
    },
  });
  if (req.method === "GET") {
    return res.status(200).json({ webhooks: webhooks });
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
    const webhook = await prisma.webhook.findUnique({
      where: {
        id: req.query.hook as string,
      },
    });

    if (!webhook) {
      return res.status(404).json({ message: "Invalid Webhook" });
    }

    await prisma.webhook.update({
      where: {
        id: req.query.hook as string,
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
