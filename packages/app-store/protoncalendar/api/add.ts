import type { NextApiRequest, NextApiResponse } from "next";

import { symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { BuildCalendarService } from "../lib/CalendarService";

function isAllowedBridgeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return (u.hostname === "127.0.0.1" || u.hostname === "localhost") && u.protocol === "http:";
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { username, password, url } = req.body;

    if (!isAllowedBridgeUrl(url)) {
      return res.status(400).json({ message: "invalid_bridge_url" });
    }

    const encryptionKey = process.env.CALENDSO_ENCRYPTION_KEY;
    if (!encryptionKey) {
      logger.error("CALENDSO_ENCRYPTION_KEY is not set");
      return res.status(500).json({ message: "encryption_key_not_configured" });
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
      type: "proton_calendar",
      key: symmetricEncrypt(JSON.stringify({ username, password, url }), encryptionKey),
      userId: user.id,
      teamId: null,
      appId: "proton-calendar",
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
      await dav?.listCalendars();
      await prisma.credential.create({
        data,
      });
    } catch (reason) {
      logger.error("Could not add this proton calendar account", reason);
      return res.status(500).json({ message: "unable_to_add_proton_calendar" });
    }

    return res
      .status(200)
      .json({ url: getInstalledAppPath({ variant: "calendar", slug: "proton-calendar" }) });
  }

  if (req.method === "GET") {
    return res.status(200).json({ url: "/apps/proton-calendar/setup" });
  }

  return res.setHeader("Allow", "GET, POST").status(405).json({ message: "method_not_allowed" });
}
