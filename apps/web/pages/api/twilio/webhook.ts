import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "querystring";
import getRawBody from "raw-body";

import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { WorkflowStatus } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["api/webhook/twilio"] });

// Map event statuses to workflow statuses
const statusMap = {
  delivered: WorkflowStatus.DELIVERED,
  read: WorkflowStatus.READ,
  undelivered: WorkflowStatus.FAILED,
  failed: WorkflowStatus.FAILED,
  sent: WorkflowStatus.DELIVERED,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const rawBody = await getRawBody(req);
    const parsedBody = parse(rawBody.toString());
    const { SmsStatus: event, SmsSid: msgId } = parsedBody;
    const { channel } = req.query as {
      channel: "SMS" | "WHATSAPP";
    };

    if (!msgId || !event) {
      log.warn(`Webhook fields not found: msgId=${msgId}, event=${event}`);
      return res.status(400).json({ error: "Missing required fields (msgId or event)" });
    }

    const status = statusMap[event as keyof typeof statusMap];
    if (!status) {
      log.warn(`Unhandled status: ${event}`);
      return res.status(200).json({ error: "Status not handled" });
    }

    // ONLY update existing workflow insights - never create new ones
    log.info("Updating workflow insights for SMS/WhatsApp event", { msgId, event, status, channel });

    const existingInsight = await prisma.calIdWorkflowInsights.findFirst({
      where: {
        msgId: msgId,
        status: {
          not: WorkflowStatus.DELIVERED,
        },
      },
    });

    if (!existingInsight) {
      log.warn(`No existing workflow insight found for msgId ${msgId}, skipping update`);
      console.warn(`No existing workflow insight found for msgId ${msgId}, skipping update`);
      return res.status(200).json({ warning: "No existing insight found, skipped update" });
    }

    await prisma.calIdWorkflowInsights.update({
      where: { msgId: msgId },
      data: { status: status },
    });

    log.info("Successfully updated workflow insights for SMS/WhatsApp event", { msgId, event, status });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error in /api/webhook/twilio", err);
    log.error("Error in /api/webhook/twilio", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
