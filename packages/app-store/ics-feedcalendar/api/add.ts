import type { NextApiRequest, NextApiResponse } from "next";

import { symmetricEncrypt } from "../../../../lib/crypto.js";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import appConfig from "../config.json" with { type: "json" };
import { CalendarService } from "../lib";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const prisma = (await import("@calcom/prisma")).default;
  if (req.method === "POST") {
    const { urls } = req.body;
    // Get user
    const user = await prisma.user.findFirstOrThrow({
      where: {
        id: req.session?.user?.id,
      },
      select: {
        id: true,
        email: true,
      },
    });

    const data = {
      type: appConfig.type,
      key: symmetricEncrypt(JSON.stringify({ urls }), process.env.CALENDSO_ENCRYPTION_KEY || ""),
      userId: user.id,
      teamId: null,
      appId: appConfig.slug,
      invalid: false,
      delegationCredentialId: null,
    };

    try {
      const dav = new CalendarService({
        id: 0,
        ...data,
        user: { email: user.email },
      });
      const listedCals = await dav.listCalendars();

      if (listedCals.length !== urls.length) {
        throw new Error(`Listed cals and URLs mismatch: ${listedCals.length} vs. ${urls.length}`);
      }

      await prisma.credential.create({
        data,
      });
    } catch (e) {
      const logger = await import("../../../../lib/logger.js").then(m => m.default);
      (await logger).error("Could not add ICS feeds", e);
      return res.status(500).json({ message: "Could not add ICS feeds" });
    }

    return res.status(200).json({ url: getInstalledAppPath({ variant: "calendar", slug: "ics-feed" }) });
  }

  if (req.method === "GET") {
    return res.status(200).json({ url: "/apps/ics-feed/setup" });
  }
}
