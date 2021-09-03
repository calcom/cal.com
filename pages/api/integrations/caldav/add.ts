import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@lib/auth";
import prisma from "../../../../lib/prisma";
import { symmetricEncrypt } from "@lib/crypto";
import logger from "@lib/logger";
import { CalDavCalendar } from "@lib/integrations/CalDav/CalDavCalendarAdapter";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    // Check that user is authenticated
    const session = await getSession({ req: req });

    if (!session) {
      res.status(401).json({ message: "You must be logged in to do this" });
      return;
    }

    const { username, password, url } = req.body;
    // Get user
    await prisma.user.findFirst({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
      },
    });

    try {
      const dav = new CalDavCalendar({
        id: 0,
        type: "caldav_calendar",
        key: symmetricEncrypt(
          JSON.stringify({ username, password, url }),
          process.env.CALENDSO_ENCRYPTION_KEY
        ),
        userId: session.user.id,
      });

      await dav.listCalendars();
      await prisma.credential.create({
        data: {
          type: "caldav_calendar",
          key: symmetricEncrypt(
            JSON.stringify({ username, password, url }),
            process.env.CALENDSO_ENCRYPTION_KEY
          ),
          userId: session.user.id,
        },
      });
    } catch (reason) {
      logger.error("Could not add this caldav account", reason);
      return res.status(500).json({ message: "Could not add this caldav account" });
    }

    return res.status(200).json({});
  }
}
