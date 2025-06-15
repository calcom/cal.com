import type { NextApiRequest, NextApiResponse } from "next";

import findValidApiKey from "@calcom/features/ee/api-keys/lib/findValidApiKey";
import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.query.apiKey as string;

  if (!apiKey) {
    return res.status(401).json({ message: "No API key provided" });
  }

  const validKey = await findValidApiKey(apiKey, "zapier");

  if (!validKey) {
    return res.status(401).json({ message: "API key not valid" });
  }

  if (req.method === "GET") {
    try {
      if (validKey.teamId) {
        const team = await prisma.team.findFirst({
          where: {
            id: validKey.teamId,
          },
        });
        return res.status(201).json({ username: team?.name });
      }

      const user = await prisma.user.findFirst({
        where: {
          id: validKey.userId,
        },
        select: {
          username: true,
        },
      });
      return res.status(201).json(user);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Unable to get User." });
    }
  }
}
