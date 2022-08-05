import type { NextApiRequest, NextApiResponse } from "next";

import { symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }
  const appType = "closecom_other_calendar";

  if (req.method === "GET") {
    try {
      const alreadyInstalled = await prisma.credential.findFirst({
        where: {
          type: appType,
          userId: req.session.user.id,
        },
      });
      if (alreadyInstalled) {
        throw new Error("Already installed");
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      return res.status(500);
    }

    return res.status(200).json({ url: "/apps/close/setup" });
  }

  if (req.method === "POST") {
    const { apiKey } = req.body;
    // Get user
    const user = await prisma.user.findFirst({
      rejectOnNotFound: true,
      where: {
        id: req.session?.user?.id,
      },
      select: {
        id: true,
      },
    });

    const data = {
      type: "closecom_other_calendar",
      key: { encrypted: symmetricEncrypt(JSON.stringify({ apiKey }), process.env.CALENDSO_ENCRYPTION_KEY!) },
      userId: user.id,
      appId: "closecom",
    };

    try {
      await prisma.credential.create({
        data,
      });
    } catch (reason) {
      logger.error("Could not add Close.com app", reason);
      return res.status(500).json({ message: "Could not add Close.com app" });
    }

    return res.status(200).json({ url: "/apps/installed" });
  }
}
