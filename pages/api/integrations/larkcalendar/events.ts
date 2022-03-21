import type { NextApiRequest, NextApiResponse } from "next";

import { CALENDAR_INTEGRATIONS_TYPES } from "@lib/integrations/calendar/constants/generals";
import {
  INTEGRATION_CREDENTIAL_KEY,
  AppCredential,
} from "@lib/integrations/calendar/services/LarkCalendarService/AppCredential";
import { LARK_OPEN_VERIFICATION_TOKEN } from "@lib/integrations/calendar/services/LarkCalendarService/helper";
import logger from "@lib/logger";
import prisma from "@lib/prisma";

const log = logger.getChildLogger({ prefix: [`[[callback] ${CALENDAR_INTEGRATIONS_TYPES.lark}`] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  log.info("receive events", req.body);
  if (req.method === "POST") {
    if (LARK_OPEN_VERIFICATION_TOKEN !== req.body.token) {
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
      const credentialValue = await prisma.integrationCredential.findFirst({
        where: {
          key: INTEGRATION_CREDENTIAL_KEY,
        },
      });
      if (credentialValue) {
        const credential: AppCredential = {
          ...(credentialValue.value as AppCredential),
          appTicket,
        };
        await prisma.integrationCredential.update({
          data: {
            value: credential,
            key: INTEGRATION_CREDENTIAL_KEY,
          },
          where: {
            id: credentialValue.id,
          },
        });
      } else {
        await prisma.integrationCredential.create({
          data: {
            value: {
              appTicket,
            },
            key: INTEGRATION_CREDENTIAL_KEY,
          },
        });
      }
      return res.status(200).json({ code: 0, msg: "success" });
    }
  }

  return res.status(200).json({ code: 0, msg: "success" });
}
