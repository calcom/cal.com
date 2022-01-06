import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import { symmetricEncrypt } from "@lib/crypto";
import { getCalendar } from "@lib/integrations/calendar/CalendarManager";
import logger from "@lib/logger";
import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    // Check that user is authenticated
    const session = await getSession({ req });

    if (!session?.user?.id) {
      res.status(401).json({ message: "You must be logged in to do this" });
      return;
    }

    const { username, password, url } = req.body;
    // Get user
    const user = await prisma.user.findFirst({
      rejectOnNotFound: true,
      where: {
        id: session?.user?.id,
      },
      select: {
        id: true,
      },
    });

    const data = {
      type: "caldav_calendar",
      key: symmetricEncrypt(
        JSON.stringify({ username, password, url }),
        process.env.CALENDSO_ENCRYPTION_KEY!
      ),
      userId: user.id,
    };

    try {
      const dav = getCalendar({
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

    return res.status(200).json({});
  }
}
