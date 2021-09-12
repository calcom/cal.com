import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/prisma";
import { getSession } from "next-auth/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });
  if (!session) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  // GET /api/webhook/{hook}

  const webhooks = await prisma.webhook.findFirst({
    where: {
      id: Number(req.query.hook),
      userId: session.user.id,
    },
    include: {
      eventType: {
        include: {
          eventType: true,
        },
      },
    },
  });
  if (req.method === "GET") {
    return res.status(200).json({ webhooks: webhooks });
  }

  //   // DELETE /api/webhook/{hook}
  if (req.method === "DELETE") {
    await prisma.webhookEventTypes.deleteMany({
      where: {
        webhookId: Number(req.query.hook),
      },
    });
    await prisma.webhook.delete({
      where: {
        id: Number(req.query.hook),
      },
    });
    return res.status(204).send(null);
  }
}
