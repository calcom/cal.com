import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/prisma";
import { getSession } from "next-auth/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });

  if (!session) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  // List eventTypes
  if (req.method === "GET") {
    const eventTypes = await prisma.eventType.findMany({
      where: {
        userId: session.user.id,
      },
    });

    return res.status(200).json({ eventTypes: eventTypes });
  }

  res.status(404).json({ message: "Team not found" });
}
