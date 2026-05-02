import type { NextApiRequest, NextApiResponse } from "next";

import { symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import appConfig from "../config.json";
import { BuildCalendarService } from "../lib";

// Proton Calendar only provides ICS feeds from these domains
const ALLOWED_PROTON_DOMAINS: string[] = ["proton.me", "protonmail.com", "protonmail.ch"];

function isProtonURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return false;
    }
    return ALLOWED_PROTON_DOMAINS.some((domain) => parsed.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

function redactURL(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}/***redacted***`;
  } catch {
    return "***invalid-url***";
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method === "POST") {
    const { urls } = req.body;

    const invalidUrls = urls.filter((url: string) => !isProtonURL(url));
    if (invalidUrls.length > 0) {
      return res.status(400).json({
        message: "Only HTTPS URLs from Proton Calendar domains (proton.me, protonmail.com) are allowed",
      });
    }

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
      const proton = BuildCalendarService({
        id: 0,
        ...data,
        user: { email: user.email },
        encryptedKey: null,
      });
      const listedCals = await proton.listCalendars();

      if (listedCals.length !== urls.length) {
        throw new Error(`Listed cals and URLs mismatch: ${listedCals.length} vs. ${urls.length}`);
      }

      await prisma.credential.create({
        data,
      });
    } catch (e) {
      let errorMessage: string;
      if (e instanceof Error) {
        errorMessage = e.message;
      } else {
        errorMessage = String(e);
      }
      logger.error(`Could not add Proton Calendar feeds for ${redactURL(urls[0])}: ${errorMessage}`);
      return res.status(500).json({ message: "Could not add Proton Calendar feeds" });
    }

    return res.status(200).json({ url: getInstalledAppPath({ variant: "calendar", slug: "proton" }) });
  }

  if (req.method === "GET") {
    return res.status(200).json({ url: "/apps/proton/setup" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
