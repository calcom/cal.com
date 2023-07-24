import type { NextApiRequest, NextApiResponse } from "next";

import { symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { CalendarService } from "../lib";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { username, password } = req.body;
    // Get user
    const user = await prisma.user.findFirstOrThrow({
      where: {
        id: req.session?.user?.id,
      },
      select: {
        id: true,
      },
    });

    const data = {
      type: "apple_calendar",
      key: symmetricEncrypt(
        JSON.stringify({ username, password }),
        process.env.CALENDSO_ENCRYPTION_KEY || ""
      ),
      userId: user.id,
      appId: "apple-calendar",
      invalid: false,
    };

    try {
      const dav = new CalendarService({
        id: 0,
        ...data,
      });
      await dav?.listCalendars();
      await prisma.credential.create({
        data,
      });
    } catch (reason) {
      logger.error("Could not add this caldav account", reason);
      return res.status(500).json({ message: "Could not add this caldav account" });
    }

    return res
      .status(200)
      .json({ url: getInstalledAppPath({ variant: "calendar", slug: "apple-calendar" }) });
  }

  if (req.method === "GET") {
    return res.status(200).json({ url: "/apps/apple-calendar/setup" });
  }
}
