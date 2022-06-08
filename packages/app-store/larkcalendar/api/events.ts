import type { NextApiRequest, NextApiResponse } from "next";

import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import { getAppKeys } from "../common";

const log = logger.getChildLogger({ prefix: [`[[lark/api/events]`] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  log.debug("receive events", req.body);
  const appKeys = await getAppKeys();

  if (!appKeys.open_verification_token) {
    log.error("no open_verification_token provided");
    return res.status(500).json({ message: "no open_verification_token provided" });
  }

  if (req.method === "POST") {
    if (appKeys.open_verification_token !== req.body.token) {
      return res.status(400).json({ message: "lark app ticket verify fails" });
    }

    if (req.body.type === "url_verification") {
      return res.status(200).json({ challenge: req.body.challenge });
    }

    if (req.body.event?.type === "app_ticket") {
      // Check that user is authenticated
      const appTicket = req.body.event?.app_ticket;
      if (!appTicket) {
        return res.status(400).json({ message: "lark app ticket error" });
      }

      await prisma.app.update({
        where: { slug: "lark-calendar" },
        data: {
          keys: {
            ...appKeys,
            app_ticket: appTicket,
          },
        },
      });
      return res.status(200).json({ code: 0, msg: "success" });
    }
  }

  return res.status(200).json({ code: 0, msg: "success" });
}
