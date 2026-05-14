import process from "node:process";
import { symmetricEncrypt } from "@calcom/lib/crypto";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import appConfig from "../config.json";
import BuildCalendarService from "../lib/CalendarService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { urls } = req.body;
    if (!req.session?.user?.id) {
      return res.status(401).json({ message: "You must be logged in to do this" });
    }

    if (
      !Array.isArray(urls) ||
      urls.length === 0 ||
      urls.some((url) => typeof url !== "string" || url.trim().length === 0)
    ) {
      return res.status(400).json({ message: "Invalid Proton Calendar URLs" });
    }

    const encryptionKey = process.env.CALENDSO_ENCRYPTION_KEY;
    if (!encryptionKey) {
      logger.error("Missing CALENDSO_ENCRYPTION_KEY while adding Proton Calendar");
      return res.status(500).json({ message: "Could not add Proton Calendar" });
    }

    const normalizedUrls = urls.map((url) => url.trim());

    try {
      const user = await prisma.user.findUniqueOrThrow({
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
        key: symmetricEncrypt(JSON.stringify({ urls: normalizedUrls }), encryptionKey),
        userId: user.id,
        teamId: null,
        appId: appConfig.slug,
        invalid: false,
        delegationCredentialId: null,
      };

      const protonCalendar = BuildCalendarService({
        id: 0,
        ...data,
        user: { email: user.email },
        encryptedKey: null,
      });
      const listedCals = await protonCalendar.listCalendars();

      if (listedCals.length !== normalizedUrls.length) {
        throw new ErrorWithCode(
          ErrorCode.BadRequest,
          `Listed calendars and URLs mismatch: ${listedCals.length} vs. ${normalizedUrls.length}`
        );
      }

      await prisma.credential.create({
        data,
      });
    } catch (e) {
      logger.error("Could not add Proton Calendar", e);
      if (e instanceof ErrorWithCode && e.code === ErrorCode.BadRequest) {
        return res.status(400).json({ message: e.message });
      }
      return res.status(500).json({ message: "Could not add Proton Calendar" });
    }

    return res.status(200).json({ url: getInstalledAppPath({ variant: "calendar", slug: appConfig.slug }) });
  }

  if (req.method === "GET") {
    return res.status(200).json({ url: "/apps/proton-calendar/setup" });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method Not Allowed" });
}
