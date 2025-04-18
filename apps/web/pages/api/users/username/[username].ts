import type { NextApiRequest, NextApiResponse } from "next";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

/**
 * @deprecated This endpoint uses the Pages Router API which is deprecated.
 * Use the App Router API at /app/api/users/username/[username]/route.ts instead.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { username } = req.query;
  const checkPrevious = req.query.checkPrevious === "true";

  if (!username || typeof username !== "string") {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    const ip = getIP(req) || "127.0.0.1";

    await checkRateLimitAndThrowError({
      rateLimitingType: "username_check",
      identifier: ip,
    });

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
    if (error.code === "TOO_MANY_REQUESTS") {
      return res.status(429).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default defaultResponder(handler, "/api/users/username/[username]");
