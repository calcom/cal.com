import process from "node:process";
import { symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import appConfig from "../config.json";
import { BuildCalendarService } from "../lib";

const log = logger.getSubLogger({ prefix: ["app:proton-calendar:add"] });

const ALLOWED_HOSTNAMES = ["calendar.proton.me", "calendar.protonmail.com"];

export function isValidProtonUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    if (url.protocol !== "https:") return false;
    return ALLOWED_HOSTNAMES.includes(url.hostname);
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { urls } = req.body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ message: "At least one Proton Calendar ICS URL is required" });
    }

    for (const url of urls) {
      if (!isValidProtonUrl(url)) {
        return res
          .status(400)
          .json({ message: "Invalid URL. Only HTTPS links from calendar.proton.me or calendar.protonmail.com are accepted." });
      }
    }

    if (!req.session?.user?.id) {
      return res.status(401).json({ message: "You must be logged in" });
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
      const dav = BuildCalendarService({
        id: 0,
        ...data,
        user: { email: user.email },
        encryptedKey: null,
      });
      const listedCals = await dav.listCalendars();

      if (listedCals.length !== urls.length) {
        throw new Error("Could not validate all provided Proton Calendar URLs");
      }

      await prisma.credential.create({
        data,
      });
    } catch {
      log.error("Could not add Proton Calendar feeds");
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
