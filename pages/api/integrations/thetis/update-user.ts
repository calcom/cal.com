import type { NextApiRequest, NextApiResponse } from "next";

import logger from "@lib/logger";
import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    // Check that requested is authenticated
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== process.env.THETIS_API_KEY) {
      logger.info("Access denied!");
      return res.status(403).json({ error: "Access denied!" });
    }

    const {
      id,
      price,
      instructorPublicName,
      instructorHandle,
    }: { id: string; price: number; instructorPublicName: string; instructorHandle: string } = req.body;

    if (!id) {
      logger.error("Could not update event type for this user: missing id");
      return res.status(400).json({ message: "Could not update event type for this user: missing id" });
    }

    if (!price) {
      logger.error("Could not update event type for this user: missing price");
      return res.status(400).json({ message: "Could not update event type for this user: missing price" });
    }

    const updatedEventTypes = await prisma.eventType.updateMany({
      where: {
        users: {
          every: {
            thetisId: id,
          },
        },
      },
      data: {
        description: `1on1 Meeting with ${instructorPublicName}`,
        price,
      },
    });

    logger.info(instructorPublicName, instructorHandle);

    const user = await prisma.user.update({
      where: { thetisId: id },
      data: {
        name: instructorPublicName,
        username: instructorHandle,
      },
    });

    logger.info(`EventTypes updated: ${updatedEventTypes.count} with price ${price}`);
    logger.info(`Users updated: ${user.username}`);
    return res.status(200).json({ message: "EventTypes and User updated" });
  }
}
