import type { NextApiRequest, NextApiResponse } from "next";

import { symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import checkSession from "../../_utils/auth";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { checkInstalled } from "../../_utils/installation";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = checkSession(req);

  if (req.method === "GET") {
    await checkInstalled("sendgrid", session.user?.id);
    return res.status(200).json({ url: "/apps/sendgrid/setup" });
  }

  if (req.method === "POST") {
    const { api_key } = req.body;
    if (!api_key) res.status(400).json({ message: "No Api Key provided to check" });

    const encrypted = symmetricEncrypt(
      JSON.stringify({ api_key }),
      process.env.CALENDSO_ENCRYPTION_KEY || ""
    );

    const data = {
      type: "sendgrid_other_calendar",
      key: { encrypted },
      userId: session.user?.id,
      appId: "sendgrid",
    };

    try {
      await prisma.credential.create({
        data,
      });
    } catch (reason) {
      logger.error("Could not add Sendgrid app", reason);
      return res.status(500).json({ message: "Could not add Sendgrid app" });
    }

    return res.status(200).json({ url: getInstalledAppPath({ variant: "other", slug: "sendgrid" }) });
  }
}
