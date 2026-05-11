import process from "node:process";
import { symmetricEncrypt } from "@calcom/lib/crypto";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import appConfig from "../config.json";
import { BuildCalendarService } from "../lib";
import { isProtonCalendarUrl } from "../lib/validateProtonCalendarUrl";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method === "POST") {
    const userId = req.session?.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    let url = "";
    if (typeof req.body?.url === "string") {
      url = req.body.url.trim();
    }

    if (!isProtonCalendarUrl(url)) {
      res.status(400).json({ message: "Enter a valid Proton Calendar share link" });
      return;
    }

    if (!process.env.CALENDSO_ENCRYPTION_KEY) {
      res.status(500).json({ message: "Server configuration error" });
      return;
    }

    try {
      const user = await prisma.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        select: {
          id: true,
          email: true,
        },
      });

      const data = {
        type: appConfig.type,
        key: symmetricEncrypt(JSON.stringify({ urls: [url] }), process.env.CALENDSO_ENCRYPTION_KEY),
        userId: user.id,
        teamId: null,
        appId: appConfig.slug,
        invalid: false,
        delegationCredentialId: null,
      };

      const calendar = BuildCalendarService({
        id: 0,
        ...data,
        user: { email: user.email },
        encryptedKey: null,
      });
      const listedCalendars = await calendar.listCalendars();

      if (listedCalendars.length !== 1) {
        throw new Error(`Listed calendars and URLs mismatch: ${listedCalendars.length} vs. 1`);
      }

      await prisma.credential.create({
        data,
      });
    } catch {
      res.status(500).json({ message: "Could not add Proton Calendar" });
      return;
    }

    res.status(200).json({ url: getInstalledAppPath({ variant: "calendar", slug: "proton-calendar" }) });
    return;
  }

  if (req.method === "GET") {
    res.status(200).json({ url: "/apps/proton-calendar/setup" });
  }
}
