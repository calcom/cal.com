import type { NextApiRequest, NextApiResponse } from "next";

import { symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import appConfig from "../config.json";
import { BuildCalendarService } from "../lib";

const ALLOWED_DOMAINS = ["proton.me", "protonmail.com", "calendar.proton.me"];

function isValidProtonUrl(urlString: string): { valid: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, reason: "Invalid URL format" };
  }

  if (parsed.protocol !== "https:") {
    return { valid: false, reason: "URL must use HTTPS" };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isAllowed = ALLOWED_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );

  if (!isAllowed) {
    return {
      valid: false,
      reason: `URL must be from a Proton domain (${ALLOWED_DOMAINS.join(", ")})`,
    };
  }

  return { valid: true };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ message: "Missing or invalid 'url' field" });
  }

  const urlValidation = isValidProtonUrl(url.trim());
  if (!urlValidation.valid) {
    return res.status(400).json({ message: urlValidation.reason });
  }

  const trimmedUrl = url.trim();

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
    key: symmetricEncrypt(
      JSON.stringify({ url: trimmedUrl }),
      process.env.CALENDSO_ENCRYPTION_KEY || ""
    ),
    userId: user.id,
    teamId: null,
    appId: appConfig.slug,
    invalid: false,
    delegationCredentialId: null,
  };

  try {
    const calendarService = BuildCalendarService({
      id: 0,
      ...data,
      user: { email: user.email },
      encryptedKey: null,
    });

    // Verify the feed is accessible before saving
    await calendarService.listCalendars();

    await prisma.credential.create({
      data,
    });
  } catch (e) {
    logger.error("Could not add Proton Calendar ICS feed", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    // Surface friendly messages for auth errors
    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
      return res.status(400).json({
        message:
          "Could not access the ICS feed. Make sure the link is a public feed URL (not password-protected).",
      });
    }
    if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
      return res.status(400).json({
        message:
          "Access denied. Ensure the Proton Calendar sharing setting is set to 'Anyone with the link'.",
      });
    }
    if (errorMessage.includes("404") || errorMessage.includes("Not Found")) {
      return res.status(400).json({
        message: "Could not find the calendar. Please verify the ICS feed URL is correct.",
      });
    }
    return res.status(500).json({ message: "Could not add Proton Calendar ICS feed" });
  }

  return res.status(200).json({
    url: getInstalledAppPath({ variant: "calendar", slug: "proton-calendar" }),
  });
}
