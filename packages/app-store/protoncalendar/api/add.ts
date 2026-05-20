import type { NextApiRequest, NextApiResponse } from "next";

import { symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import appConfig from "../config.json";
import { BuildCalendarService } from "../lib";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { urls } = req.body;

    if (!urls || (Array.isArray(urls) && urls.length === 0)) {
      return res
        .status(400)
        .json({ message: "At least one Proton Calendar ICS feed URL is required" });
    }

    const urlList: string[] = Array.isArray(urls) ? urls : [urls];

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
      key: symmetricEncrypt(
        JSON.stringify({ urls: urlList }),
        process.env.CALENDSO_ENCRYPTION_KEY || ""
      ),
      userId: user.id,
      teamId: null,
      appId: appConfig.slug,
      invalid: false,
      delegationCredentialId: null,
    };

    try {
      const protonService = BuildCalendarService({
        id: 0,
        ...data,
        user: { email: user.email },
        encryptedKey: null,
      });
      const listedCals = await protonService.listCalendars();

      if (listedCals.length !== urlList.length) {
        throw new Error(
          `Listed calendars and URLs mismatch: ${listedCals.length} vs. ${urlList.length}`
        );
      }

      await prisma.credential.create({ data });
    } catch (e) {
      logger.error("Could not add Proton Calendar ICS feeds", e);
      return res
        .status(500)
        .json({ message: "Could not add Proton Calendar ICS feeds" });
    }

    return res
      .status(200)
      .json({
        url: getInstalledAppPath({
          variant: "calendar",
          slug: "proton-calendar",
        }),
      });
  }

  if (req.method === "GET") {
    return res.status(200).json({ url: "/apps/proton-calendar/setup" });
  }
}
