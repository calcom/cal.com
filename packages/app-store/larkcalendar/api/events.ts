import type { NextApiRequest, NextApiResponse } from "next";

import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import { getAppKeys } from "../common";
import { sendPostMsg } from "../lib/BotService";

const log = logger.getChildLogger({ prefix: [`[lark/api/events]`] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  log.debug("receive events", req.body);
  const appKeys = await getAppKeys();

  if (!appKeys.open_verification_token) {
    log.error("no open_verification_token for lark provided");
    return res.status(500).json({ message: "no open_verification_token provided" });
  }

  if (req.method === "POST") {
    if (req.body.type === "url_verification") {
      return res.status(200).json({ challenge: req.body.challenge });
    }

    if (req.body.event?.type === "app_ticket" && appKeys.open_verification_token === req.body.token) {
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

    if (req.body.header?.event_type === "im.message.receive_v1") {
      const data = req.body;
      const tenantKey = data.header?.tenant_key;
      const senderOpenId = data.event?.sender?.sender_id?.open_id;
      if (!tenantKey || !senderOpenId) {
        log.error("no valid in events", data);
        return res.status(200).json({ message: "not valid im.message.receive_v1 event" });
      }

      sendPostMsg(tenantKey, senderOpenId);

      return res.status(200).json({ code: 0, msg: "success" });
    }

    if (req.body.event?.type === "p2p_chat_create") {
      const data = req.body;
      const tenantKey = data.tenant_key;
      const senderOpenId = data.event?.user?.open_id;
      if (!tenantKey || !senderOpenId) {
        log.error("no valid in events", data);
        return res.status(200).json({ message: "not valid p2p_chat_create event" });
      }

      sendPostMsg(tenantKey, senderOpenId);

      return res.status(200).json({ code: 0, msg: "success" });
    }
  }

  return res.status(200).json({ code: 0, msg: "success" });
}
