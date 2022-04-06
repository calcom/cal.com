import type { NextApiRequest, NextApiResponse } from "next";

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
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        eventTypes: {
          where: {
            team: null,
          },
          select: {
            id: true,
            title: true,
            description: true,
            length: true,
            schedulingType: true,
            slug: true,
            hidden: true,
            metadata: true,
          },
        },
      },
    });

    return res.status(200).json({ message: "Events.", data: user?.eventTypes });
  }
}
