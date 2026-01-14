// packages/app-store/razorpay/api/webhook.ts
import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { default as Razorpay, WebhookEvents } from "@calcom/app-store/razorpay/lib/Razorpay";
import { IS_PRODUCTION, INNGEST_ID } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { inngestClient } from "@calcom/web/pages/api/inngest";

export const config = {
  api: {
    bodyParser: false,
  },
};

const log = logger.getSubLogger({ prefix: [`[razorpay/api/webhook]`] });

const verifyWebhookSchema = z
  .object({
    body: z.string().min(1),
    signature: z.string().min(1),
  })
  .passthrough();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    log.info("Received Razorpay webhook event");

    // Validate method
    if (req.method !== "POST") {
      log.warn(`Invalid method: ${req.method}`);
      return res.status(200).json({
        received: true,
        message: "Method Not Allowed",
      });
    }

    // Parse raw body
    let rawBody: string;
    try {
      rawBody = (await buffer(req)).toString("utf8");
    } catch (error) {
      log.error("Failed to parse request body:", error);
      return res.status(200).json({
        received: true,
        message: "Failed to parse body",
      });
    }

    const signature = req.headers["x-razorpay-signature"];

    // Validate webhook schema
    const parsedVerifyWebhook = verifyWebhookSchema.safeParse({
      body: rawBody,
      signature: signature,
    });

    if (!parsedVerifyWebhook.success) {
      log.error("Razorpay webhook malformed:", parsedVerifyWebhook.error);
      return res.status(200).json({
        received: true,
        message: "Malformed webhook data",
      });
    }

    // Verify webhook signature - CRITICAL security check
    let isValid: boolean;
    try {
      isValid = Razorpay.verifyWebhook(parsedVerifyWebhook.data);
    } catch (error) {
      log.error("Failed to verify webhook signature:", error);
      return res.status(200).json({
        received: true,
        message: "Signature verification failed",
      });
    }

    if (!isValid) {
      log.error("Razorpay webhook signature mismatch");
      return res.status(200).json({
        received: true,
        message: "Invalid signature",
      });
    }

    // Parse the request body
    let parsedBody: any;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (error) {
      log.error("Failed to parse JSON body:", error);
      return res.status(200).json({
        received: true,
        message: "Invalid JSON",
      });
    }

    const { event, account_id } = parsedBody;

    if (!event) {
      log.warn("No event type in webhook payload");
      return res.status(200).json({
        received: true,
        message: "No event to process",
      });
    }

    log.info(`Received webhook event: ${event}`);

    // Send event to Inngest for async processing
    try {
      const key = INNGEST_ID === "onehash-cal" ? "prod" : "stag";

      switch (event) {
        case WebhookEvents.APP_REVOKED:
          if (!account_id) {
            log.warn("APP_REVOKED event missing account_id");
            return res.status(200).json({
              received: true,
              message: "Missing account_id",
            });
          }

          await inngestClient.send({
            name: `razorpay/app.revoked-${key}`,
            data: {
              accountId: account_id,
              rawEvent: parsedBody,
            },
          });

          log.info(`Sent APP_REVOKED event to Inngest for account: ${account_id}`);
          break;

        case WebhookEvents.PAYMENT_LINK_PAID:
          const paymentId = parsedBody.payload?.payment?.entity?.id;
          const paymentLinkId = parsedBody.payload?.payment_link?.entity?.id;

          if (!paymentId || !paymentLinkId) {
            log.warn("PAYMENT_LINK_PAID event missing required data");
            return res.status(200).json({
              received: true,
              message: "Missing payment data",
            });
          }

          await inngestClient.send({
            name: `razorpay/payment-link.paid-${key}`,
            data: {
              paymentId,
              paymentLinkId,
              rawEvent: parsedBody,
            },
          });

          log.info(`Sent PAYMENT_LINK_PAID event to Inngest: ${paymentId}`);
          break;

        default:
          log.info(`Unhandled webhook event type: ${event}`);
          return res.status(200).json({
            received: true,
            message: "Event type not handled",
          });
      }

      // Immediate success response - event queued for processing
      return res.status(200).json({
        received: true,
        message: "Webhook received and queued for processing",
      });
    } catch (inngestError) {
      // If Inngest send fails, log but still acknowledge webhook
      log.error("Failed to send event to Inngest:", inngestError);
      return res.status(200).json({
        received: true,
        message: "Webhook received but queuing failed",
      });
    }
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    log.error(`Webhook Error: ${err.message}`, {
      stack: err.stack,
    });

    // Always return 200 to prevent webhook disabling
    return res.status(200).json({
      received: true,
      message: "Webhook received but processing failed",
      error: IS_PRODUCTION ? undefined : err.message,
    });
  }
}
