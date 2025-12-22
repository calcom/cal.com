import type { NextApiRequest, NextApiResponse } from "next";
import { parse } from "querystring";
import getRawBody from "raw-body";

import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { WorkflowMethods, WorkflowStatus } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["api/webhook/twilio"] });

// Map event statuses to workflow statuses
const statusMap = {
  delivered: WorkflowStatus.DELIVERED,
  read: WorkflowStatus.READ,
  undelivered: WorkflowStatus.FAILED,
  failed: WorkflowStatus.FAILED,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const rawBody = await getRawBody(req);
    const parsedBody = parse(rawBody.toString());
    const { SmsStatus: event } = parsedBody;
    const { msgId, eventTypeId, bookingUid, seatReferenceUid, channel } = req.query as {
      msgId: string;
      eventTypeId: string;
      channel: "SMS" | "WHATSAPP";
      bookingUid?: string;
      seatReferenceUid?: string;
    };

    if (!msgId || !event || !eventTypeId) {
      log.warn(`Webhook fields not found: ${msgId}, ${event}, ${eventTypeId}`);
      return res.status(400).json({ error: "Missing required fields" });
    }

    const eventType = await prisma.eventType.findUnique({
      where: { id: Number(eventTypeId) },
    });

    if (!eventType) {
      log.warn(`Event not found with ID ${eventTypeId} skipping operation`);
      console.warn(`Event not found with ID ${eventTypeId} skipping operation`);
      return res.status(200).json({ error: `EventType not found skipping operation` });
    }

    const status = statusMap[event as keyof typeof statusMap];
    if (!status) {
      return res.status(200).json({ error: "Status not handled" });
    }

    await prisma.calIdWorkflowInsights.upsert({
      where: { msgId },
      update: { status },
      create: {
        msgId,
        eventTypeId: Number(eventTypeId),
        type: channel === "SMS" ? WorkflowMethods.SMS : WorkflowMethods.WHATSAPP,
        status,
        ...(bookingUid && { bookingUid: bookingUid }),
        ...(seatReferenceUid && { bookingSeatReferenceUid: seatReferenceUid }),
      },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error in /api/webhook/twilio", err);
    log.error("Error in / /api/webhook/twilio", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
