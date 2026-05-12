import process from "node:process";
import { symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import appConfig from "../config.json";
import { BuildCalendarService } from "../lib";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { urls } = req.body;
    if (!req.session?.user?.id) {
      return res.status(401).json({ message: "You must be logged in to do this" });
    }

    if (!Array.isArray(urls) || urls.length === 0 || urls.some((url) => typeof url !== "string")) {
      return res.status(400).json({ message: "Invalid Proton Calendar URLs" });
    }

    const user = await prisma.user.findFirstOrThrow({
      where: {
        id: req.session.user.id,
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
      const protonCalendar = BuildCalendarService({
        id: 0,
        ...data,
        user: { email: user.email },
        encryptedKey: null,
      });
      const listedCals = await protonCalendar.listCalendars();

      if (listedCals.length !== urls.length) {
        throw new Error(`Listed calendars and URLs mismatch: ${listedCals.length} vs. ${urls.length}`);
      }

      await prisma.credential.create({
        data,
      });
    } catch (e) {
      logger.error("Could not add Proton Calendar", e);
      return res.status(500).json({ message: "Could not add Proton Calendar" });
    }

    return res
      .status(200)
      .json({ url: getInstalledAppPath({ variant: "calendar", slug: "proton-calendar" }) });
  }

  if (req.method === "GET") {
    return res.status(200).json({ url: "/apps/proton-calendar/setup" });
  }
}
