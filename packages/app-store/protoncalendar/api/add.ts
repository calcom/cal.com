import process from "node:process";
import { symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import appConfig from "../config.json";
import BuildCalendarService from "../lib/CalendarService";
import { isValidProtonCalendarUrl, normalizeProtonCalendarUrl } from "../lib/validateProtonCalendarUrl";

const CALENDSO_ENCRYPTION_KEY = process.env.CALENDSO_ENCRYPTION_KEY || "";
if (!process.env.CALENDSO_ENCRYPTION_KEY) {
  throw new Error("Missing CALENDSO_ENCRYPTION_KEY environment variable");
}

/**
 * Helper to construct a validation credential payload matching the shape required
 * by BuildCalendarService for validation/testing purposes.
 * @param data - The raw credential data fields.
 * @param email - The email address associated with the user.
 * @returns The structured validation credential object.
 */
function makeValidationCredential(data: Record<string, unknown>, email: string | null | undefined) {
  return {
    id: 0,
    ...data,
    user: { email: email ?? "" },
    encryptedKey: null,
  };
}

/**
 * Next.js API route handler to validate and add Proton Calendar ICS subscription feeds.
 * Supports POST for additions (encrypts URLs and tests availability check before saving)
 * and GET for redirect URLs.
 * @param req - The Next.js API request object.
 * @param res - The Next.js API response object.
 */
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
      key: symmetricEncrypt(JSON.stringify({ urls: normalizedUrls }), CALENDSO_ENCRYPTION_KEY),
      userId: user.id,
      teamId: null,
      appId: appConfig.slug,
      invalid: false,
      delegationCredentialId: null,
    };

    try {
      const protonCalendar = BuildCalendarService(makeValidationCredential(data, user.email));
      const listedCalendars = await protonCalendar.listCalendars();

      if (listedCalendars.length !== normalizedUrls.length) {
        throw new Error(
          `Listed calendars and URLs mismatch: ${listedCalendars.length} vs. ${normalizedUrls.length}`
        );
      }

      await prisma.credential.create({
        data,
      });
    } catch (error) {
      logger.error("Could not add Proton Calendar feeds", {
        message: error instanceof Error ? error.message : "Unknown error",
        error,
      });
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
