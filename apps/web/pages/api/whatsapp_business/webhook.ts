import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import { META_WEBHOOK_VERIFICATION_CODE } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { WorkflowStatus } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["api/webhook/meta-whatsapp"] });

// Map WhatsApp status to workflow status
const statusMap: Record<string, WorkflowStatus> = {
  sent: WorkflowStatus.DELIVERED,
  delivered: WorkflowStatus.DELIVERED,
  read: WorkflowStatus.READ,
  failed: WorkflowStatus.FAILED,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === META_WEBHOOK_VERIFICATION_CODE) {
      res.status(200).send(challenge);
    } else {
      res.status(403).end();
    }
  } else if (req.method === "POST") {
    try {
      const rawBody = await getRawBody(req);
      const body = JSON.parse(rawBody.toString());

      log.info("Received webhook:", JSON.stringify(body, null, 2));

      // Validate webhook structure
      if (body.object !== "whatsapp_business_account") {
        log.warn("Invalid webhook object type");
        return res.status(400).json({ error: "Invalid webhook object" });
      }

      // Process all entries
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          // Only process messages field
          if (change.field !== "messages") {
            continue;
          }

          const value = change.value;

          // Handle status updates
          if (value?.statuses && Array.isArray(value.statuses)) {
            for (const statusUpdate of value.statuses) {
              const msgId = statusUpdate.id;
              const status = statusUpdate.status;

              if (!msgId || !status) {
                log.warn("Missing msgId or status in status update");
                continue;
              }

              const mappedStatus = statusMap[status];
              if (!mappedStatus) {
                log.info(`Status '${status}' not mapped, skipping`);
                continue;
              }

              // Find existing insight and update status
              const existingInsight = await prisma.calIdWorkflowInsights.findUnique({
                where: { msgId },
              });

              if (existingInsight) {
                await prisma.calIdWorkflowInsights.update({
                  where: { msgId },
                  data: { status: mappedStatus },
                });
                log.info(`Updated message ${msgId} to status ${mappedStatus}`);
              } else {
                log.warn(`Message ${msgId} not found in database, skipping update`);
              }
            }
          }

          // Handle incoming messages (optional - for logging/tracking)
          if (value?.messages && Array.isArray(value.messages)) {
            for (const message of value.messages) {
              const msgId = message.id;
              const from = message.from;
              const messageType = message.type;
              
              log.info(`Received incoming message: ${msgId} from ${from} type ${messageType}`);
              // Add any logic here if you need to handle incoming messages
            }
          }
        }
      }

      res.status(200).json({ success: true });
    } catch (err) {
      console.error("Error in /api/webhook/meta-whatsapp", err);
      log.error("Error in /api/webhook/meta-whatsapp", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};