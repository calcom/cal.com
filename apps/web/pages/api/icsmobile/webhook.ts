import type { NextApiRequest, NextApiResponse } from "next";

import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { WorkflowStatus } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["api/webhook/icsmobile"] });

// Map ICSMobile statuses to workflow statuses
const statusMap = {
  DELIVERED: WorkflowStatus.DELIVERED,
  FAILED: WorkflowStatus.FAILED,
  SENT: WorkflowStatus.DELIVERED,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { qStatus, qMobile, qMsgRef, qDTime, SMSMSGID, qNotes } = req.query;

    // Validate required parameters
    if (!SMSMSGID || !qStatus) {
      log.warn(`Webhook fields not found: SMSMSGID=${SMSMSGID}, qStatus=${qStatus}`);
      return res.status(400).json({ error: "Missing required fields (SMSMSGID or qStatus)" });
    }

    // Extract values (query params can be string or string[])
    const msgId = Array.isArray(SMSMSGID) ? SMSMSGID[0] : SMSMSGID;
    const statusString = Array.isArray(qStatus) ? qStatus[0] : qStatus;
    const mobile = Array.isArray(qMobile) ? qMobile[0] : qMobile;
    const icsMsgRef = Array.isArray(qMsgRef) ? qMsgRef[0] : qMsgRef;
    const deliveryTime = Array.isArray(qDTime) ? qDTime[0] : qDTime;
    const notes = Array.isArray(qNotes) ? qNotes[0] : qNotes;

    // Normalize status
    const status = statusMap[statusString as keyof typeof statusMap];
    if (!status) {
      log.warn(`Unhandled status: ${statusString}`);
      return res.status(200).json({ error: "Status not handled" });
    }

    log.info("Processing ICSMobile webhook", {
      msgId,
      status: statusString,
      mobile,
      icsMsgRef,
      deliveryTime,
      notes,
    });

    // ONLY update existing workflow insights - never create new ones
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

    // Build metadata with all ICSMobile fields
    const metadata = {
      ...(existingInsight.metadata as object),
      icsMobile: {
        qStatus: statusString,
        qMobile: mobile,
        qMsgRef: icsMsgRef,
        qDTime: deliveryTime,
        qNotes: notes,
        updatedAt: new Date().toISOString(),
      },
    };

    await prisma.calIdWorkflowInsights.update({
      where: { msgId: msgId },
      data: {
        status: status,
        metadata: metadata,
      },
    });

    log.info("Successfully updated workflow insights for ICSMobile event", {
      msgId,
      status: statusString,
      normalizedStatus: status,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error in /api/webhook/icsmobile", err);
    log.error("Error in /api/webhook/icsmobile", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
