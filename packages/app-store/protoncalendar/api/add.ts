import type { NextApiRequest, NextApiResponse } from "next";

import { symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import appConfig from "../config.json";
import { BuildCalendarService } from "../lib";

const log = logger.getSubLogger({ prefix: ["[proton-calendar/api/add]"] });

/**
 * Validates that a URL looks like a legitimate Proton Calendar ICS share URL.
 *
 * Proton Calendar share URLs are HTTPS and originate from calendar.proton.me
 * or protonmail.com domains. We enforce HTTPS to prevent SSRF against plain-
 * HTTP endpoints and restrict the host to known Proton domains.
 *
 * Note: If Proton ever introduces other domains, this list should be extended.
 */
function validateProtonIcsUrl(url: string): { valid: boolean; message: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, message: "The ICS feed URL is not a valid URL." };
  }

  if (parsed.protocol !== "https:") {
    return { valid: false, message: "The ICS feed URL must use HTTPS." };
  }

  const ALLOWED_HOSTS = ["proton.me", "protonmail.com"];

  const isAllowed = ALLOWED_HOSTS.some(
    (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
  );

  if (!isAllowed) {
    return {
      valid: false,
      message:
        "The URL must be a valid Proton Calendar share link (e.g. from calendar.proton.me). " +
        "Please open Proton Calendar → Share → Share with link to get your ICS feed URL.",
    };
  }

  return { valid: true, message: "" };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { url, urls: rawUrls } = req.body as { url?: string; urls?: unknown };

    // Runtime-validate before accessing array methods to prevent pre-try-catch throws
    const normalizedRawUrls = Array.isArray(rawUrls) ? rawUrls : undefined;

    // Normalise to an array — the setup UI sends a single `url`, but we store
    // an array for consistency with ics-feedcalendar so future multi-calendar
    // support is straightforward.
    const urls: string[] = (
      normalizedRawUrls && normalizedRawUrls.length > 0 ? normalizedRawUrls : url ? [url] : []
    ).map((u: unknown) => String(u).trim()).filter(Boolean);

    if (urls.length === 0) {
      return res.status(400).json({ message: "Please provide a Proton Calendar ICS feed URL." });
    }

    // Validate each URL before we do anything
    for (const u of urls) {
      const { valid, message } = validateProtonIcsUrl(u);
      if (!valid) {
        return res.status(400).json({ message });
      }
    }

    const user = await prisma.user.findFirstOrThrow({
      where: { id: req.session?.user?.id },
      select: { id: true, email: true },
    });

    const data = {
      type: appConfig.type,
      key: symmetricEncrypt(
        JSON.stringify({ urls }),
        process.env.CALENDSO_ENCRYPTION_KEY || ""
      ),
      userId: user.id,
      teamId: null,
      appId: appConfig.slug,
      invalid: false,
      delegationCredentialId: null,
    };

    try {
      const service = BuildCalendarService({
        id: 0,
        ...data,
        user: { email: user.email },
        encryptedKey: null,
      });

      // Verify the ICS URLs are reachable and parse correctly
      const listedCals = await service.listCalendars();

      if (listedCals.length !== urls.length) {
        throw new Error(
          `Could not fetch all Proton Calendar feeds. ` +
            `Expected ${urls.length} calendar(s), but successfully loaded ${listedCals.length}. ` +
            `Please check that your ICS share URL is correct and publicly accessible.`
        );
      }

      await prisma.credential.create({ data });
    } catch (e) {
      // Log only the sanitized message to avoid leaking ICS share URLs (which are credentials)
      const message =
        e instanceof Error
          ? e.message
          : "Could not connect to Proton Calendar. Please check your ICS feed URL and try again.";
      log.error("Could not add Proton Calendar ICS feed", { message });
      return res.status(500).json({ message });
    }

    return res.status(200).json({
      url: getInstalledAppPath({ variant: "calendar", slug: "proton-calendar" }),
    });
  }

  if (req.method === "GET") {
    return res.status(200).json({ url: "/apps/proton-calendar/setup" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
