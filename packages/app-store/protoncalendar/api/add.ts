import type { NextApiRequest, NextApiResponse } from "next";

import { symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import appConfig from "../config.json";
import { BuildCalendarService, getProtonIcsUrls } from "../lib";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    let urls: string[];
    try {
      urls = getProtonIcsUrls(req.body?.urls);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid Proton Calendar URLs";
      return res.status(400).json({ message });
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
      logger.error("Could not add Proton Calendar", e);
      return res.status(500).json({ message: "Could not add Proton Calendar" });
    }

    return res.status(200).json({ url: getInstalledAppPath({ variant: "calendar", slug: appConfig.slug }) });
  }

  if (req.method === "GET") {
    return res.status(200).json({ url: `/apps/${appConfig.slug}/setup` });
  }
}
