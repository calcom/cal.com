import { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!["GET", "DELETE"].includes(req.method!)) {
    return res.status(405).end();
  }

  // Check that user is authenticated
  const session = await getSession({ req });
  const userId = session?.user?.id;

  if (!userId) {
    res.status(401).json({ message: "You must be logged in to do this" });
    return;
  }

  if (req.method === "GET") {
    const credentials = await prisma.credential.findMany({
      where: {
        userId,
      },
      select: {
        type: true,
      },
    });

    res.status(200).json(credentials);
  }

  if (req.method == "DELETE") {
    const id = req.body.id;
    const data: Prisma.UserUpdateInput = {
      credentials: {
        delete: {
          id,
        },
      },
    };
    const integration = await prisma.credential.findUnique({
      where: {
        id,
      },
    });
    /* If the user deletes a zapier integration, we delete all his api keys as well. */
    if (integration?.appId === "zapier") {
      data.apiKeys = {
        deleteMany: {
          userId,
          appId: "zapier",
        },
      };
      /* We also delete all user's zapier wehbooks */
      data.webhooks = {
        deleteMany: {
          userId,
          appId: "zapier",
        },
      };
    }

    await prisma.user.update({
      where: {
        id: userId,
      },
      data,
    });

    res.status(200).json({ message: "Integration deleted successfully" });
  }
}
