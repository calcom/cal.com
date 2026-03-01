import type { NextApiRequest, NextApiResponse } from "next";

import { symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import appConfig from "../config.json";
import { BuildCalendarService } from "../lib";

const ALLOWED_HOSTNAMES = ["calendar.proton.me", "calendar.protonmail.com"];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_HOSTNAMES.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { urls } = req.body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ message: "At least one ICS feed URL is required" });
    }

    // Validate all URLs are from Proton domains
    for (const url of urls) {
      if (!isAllowedUrl(url)) {
        return res.status(400).json({
          message: `Invalid URL: only HTTPS URLs from ${ALLOWED_HOSTNAMES.join(" or ")} are accepted`,
        });
      }
    }

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
      const dav = BuildCalendarService({
        id: 0,
        ...data,
        user: { email: user.email },
        encryptedKey: null,
      });
      const listedCals = await dav.listCalendars();

      if (listedCals.length !== urls.length) {
        throw new Error(`Listed cals and URLs mismatch: ${listedCals.length} vs. ${urls.length}`);
      }

      await prisma.credential.create({
        data,
      });
    } catch (e) {
      logger.error("Could not add Proton Calendar feeds", e);
      return res.status(500).json({ message: "Could not add Proton Calendar feeds" });
    }

    return res
      .status(200)
      .json({ url: getInstalledAppPath({ variant: "calendar", slug: "proton-calendar" }) });
  }

  if (req.method === "GET") {
    return res.status(200).json({ url: "/apps/proton-calendar/setup" });
  }
}
