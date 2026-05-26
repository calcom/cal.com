import process from "node:process";
import type { NextApiRequest, NextApiResponse } from "next";

import { symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import appConfig from "../config.json";
import BuildCalendarService from "../lib/CalendarService";
import { isValidProtonCalendarUrl, normalizeProtonCalendarUrl } from "../lib/validateProtonCalendarUrl";

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const urls = Array.isArray(req.body.urls)
      ? req.body.urls.map((url: unknown) => String(url).trim()).filter(Boolean)
      : [];

    if (!urls.length || urls.some((url: string) => !isValidProtonCalendarUrl(url))) {
      return res.status(400).json({
        message: "Enter at least one valid Proton Calendar webcal or HTTPS ICS URL",
      });
    }

    const normalizedUrls = urls.map((url: string) => normalizeProtonCalendarUrl(url));

    const user = await prisma.user.findFirstOrThrow({
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
      key: symmetricEncrypt(JSON.stringify({ urls: normalizedUrls }), CALENDSO_ENCRYPTION_KEY),
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
      const listedCalendars = await protonCalendar.listCalendars();

      if (listedCalendars.length !== normalizedUrls.length) {
        throw new Error(`Listed calendars and URLs mismatch: ${listedCalendars.length} vs. ${normalizedUrls.length}`);
      }

      await prisma.credential.create({
        data,
      });
    } catch (error) {
      logger.error("Could not add Proton Calendar feeds", error);
      return res.status(500).json({ message: "Could not add Proton Calendar feeds" });
    }

    return res.status(200).json({
      url: getInstalledAppPath({ variant: "calendar", slug: appConfig.slug }),
    });
  }

  if (req.method === "GET") {
    return res.status(200).json({ url: "/apps/proton-calendar/setup" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
