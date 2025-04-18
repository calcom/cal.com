import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { username } = req.query;
  const checkPrevious = req.query.checkPrevious === "true";

  if (!username || typeof username !== "string") {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    if (checkPrevious) {
      const userWithPreviousUsername = await prisma.user.findFirst({
        where: {
          previousUsername: username,
        },
        select: {
          username: true,
        },
      });

      if (userWithPreviousUsername?.username) {
        return res.status(200).json({ currentUsername: userWithPreviousUsername.username });
      }
    }

    const user = await prisma.user.findFirst({
      where: {
        username,
      },
      select: {
        id: true,
      },
    });

    if (user) {
      return res.status(200).json({ available: false });
    }

    return res.status(200).json({ available: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
