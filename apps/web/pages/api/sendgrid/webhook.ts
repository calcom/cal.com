import type { NextApiRequest, NextApiResponse } from "next";

import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { WorkflowMethods, WorkflowStatus } from "@calcom/prisma/client";

// //event - the event type. Possible values are processed, dropped, delivered, deferred, bounce, open, click, spam report, unsubscribe, group unsubscribe, and group resubscribe.
const statusMap = {
  delivered: WorkflowStatus.DELIVERED,
  open: WorkflowStatus.READ,
  dropped: WorkflowStatus.FAILED,
  bounce: WorkflowStatus.FAILED,
  deferred: WorkflowStatus.FAILED,
  // processed: WorkflowStatus.PROCESSED,
  // click: WorkflowStatus.CLICK,
  // spamreport: WorkflowStatus.SPAM_REPORT,
  // unsubscribe: WorkflowStatus.UNSUBSCRIBE,
  // groupunsubscribe: WorkflowStatus.GROUP_UNSUBSCRIBE,
  // groupresubscribe: WorkflowStatus.GROUP_RESUBSCRIBE,
};

export const config = {
  api: {
    bodyParser: true,
  },
};

const log = logger.getSubLogger({ prefix: ["api/webhook/sengdrid"] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  log.info("Received request", req.method, req.body);
  if (req.method === "POST") {
    //VERIFICATION
    // const signature = req.headers["X-Twilio-Email-Event-Webhook-Signature"] as string;
    // const timestamp = req.headers[EventWebhookHeader.TIMESTAMP()] as string;
    // console.log("in_here_headers", signature, timestamp);
    // const verify = new EventWebhook();
    // const payload = req.body;
    // const publicKey = process.env.SENDGRID_WEBHOOK_PK;

    // if (!signature || !timestamp || !publicKey) {
    //   return res.status(400).json({ error: "Missing required headers" });
    // }

    // const ecdsaPublicKey = verify.convertPublicKeyToECDSA(publicKey);
    // const isVerified = verify.verifySignature(ecdsaPublicKey, payload, signature, timestamp);
    // console.log("in_here_verified", isVerified);
    // if (!isVerified) {
    //   return res.status(400).json({ error: "Invalid signature" });
    // }

    const events = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      log.error("Invalid request body. Expected an array of events.");
      return res.status(400).json({ error: "Invalid request body. Expected an array of events." });
    }

    try {
      for (const eventObj of events) {
        const {
          msgId,
          event,
          eventTypeId,
        }: { msgId: string; event: keyof typeof statusMap; eventTypeId: number } = eventObj;

        if (!msgId || !event || !eventTypeId) {
          log.warn("Skipping event due to missing fields", eventObj);
          console.warn("Skipping event due to missing fields", eventObj);
          continue;
        }

        const eventType = await prisma.eventType.findUnique({
          where: { id: eventTypeId },
        });

        if (!eventType) {
          log.warn(`Event not found with ID ${eventTypeId} skipping operation`);
          console.warn(`Event not found with ID ${eventTypeId} skipping operation`);
          continue;
        }

        const status = statusMap[event];
        if (!status) {
          log.warn("Skipping event due to unhandled status", event);
          console.warn("Skipping event due to unhandled status", event);
          continue;
        }

        log.info("Updating workflow insights for event", { msgId, event, eventTypeId, status });
        await prisma.calIdWorkflowInsights.upsert({
          where: { msgId: msgId },
          update: { status: status },
          create: {
            msgId: msgId,
            eventTypeId: eventTypeId,
            type: WorkflowMethods.EMAIL,
            status: status,
          },
        });
        log.info("Updated workflow insights for event", { msgId, event, eventTypeId, status });
      }

      log.info("Successfully processed events", events);
      return res.status(200).json({ success: true });
    } catch (err) {
      log.error("Error in / /api/webhook/sendgrid", err);
      console.error("Error in / /api/webhook/sendgrid", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    log.error("Method Not Allowed", req.method);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
