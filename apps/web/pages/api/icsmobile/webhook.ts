import type { NextApiRequest, NextApiResponse } from "next";

import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { WorkflowMethods, WorkflowStatus } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["api/webhook/icsmobile"] });

// Map ICSMobile delivery statuses to workflow statuses
const statusMap = {
  DELIVERED: WorkflowStatus.DELIVERED,
  FAILED: WorkflowStatus.FAILED,
  // Add other ICSMobile statuses as needed based on their documentation
  // PENDING: WorkflowStatus.PENDING,
  // SENT: WorkflowStatus.SENT,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    // ICSMobile sends data via GET query parameters
    const { qStatus, qMsgRef, SMSMSGID, qNotes } = req.query;

    // qMsgRef is ICSMobile's MESSAGEID which maps to our internal msgId
    const msgId = qMsgRef as string;

    // SMSMSGID contains our metadata (eventTypeId and channel)
    // Expected format: "eventTypeId:123|channel:SMS" or similar
    if (!msgId || !qStatus || !SMSMSGID) {
      log.warn(`Webhook fields not found: msgId=${msgId}, qStatus=${qStatus}, SMSMSGID=${SMSMSGID}`);
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Parse metadata from SMSMSGID
    // Format expected: "eventTypeId:123"
    const metadata = String(SMSMSGID);
    const eventTypeIdMatch = metadata.match(/eventTypeId:(\d+)/);

    if (!eventTypeIdMatch) {
      log.warn(`Could not parse eventTypeId from SMSMSGID: ${metadata}`);
      return res.status(400).json({ error: "Invalid metadata format" });
    }

    const eventTypeId = Number(eventTypeIdMatch[1]);
    const channel = "SMS";

    // Verify event type exists
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
    });

    if (!eventType) {
      log.warn(`Event not found with ID ${eventTypeId} skipping operation`);
      console.warn(`Event not found with ID ${eventTypeId} skipping operation`);
      return res.status(200).json({ error: `EventType not found skipping operation` });
    }

    // Map ICSMobile status to internal workflow status
    const status = statusMap[qStatus as keyof typeof statusMap];
    if (!status) {
      log.warn(`Unhandled status: ${qStatus}`);
      return res.status(200).json({ error: "Status not handled" });
    }

    // Log additional information for failed messages
    if (status === WorkflowStatus.FAILED && qNotes) {
      log.info(`Message failed with reason: ${qNotes} for msgId: ${msgId}`);
    }

    // Upsert workflow insights
    await prisma.calIdWorkflowInsights.upsert({
      where: { msgId },
      update: { status },
      create: {
        msgId,
        eventTypeId,
        type: WorkflowMethods.SMS,
        status,
      },
    });

    log.info(`Successfully processed ICSMobile webhook for msgId: ${msgId}, status: ${qStatus}`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error in /api/webhook/icsmobile", err);
    log.error("Error in /api/webhook/icsmobile", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// No need to disable bodyParser for GET requests, but keeping config for consistency
export const config = {
  api: {
    bodyParser: true,
  },
};
