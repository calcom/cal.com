import { JobName, dispatcher } from "@calid/job-dispatcher";
import type { RazorpayAppRevokedJobData, RazorpayPaymentLinkPaidJobData } from "@calid/job-engine/types";
import { QueueName } from "@calid/queue";
import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { default as Razorpay, WebhookEvents } from "@calcom/app-store/razorpay/lib/Razorpay";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";

export const config = {
  api: {
    bodyParser: false,
  },
};

const log = logger.getSubLogger({ prefix: ["[razorpay/api/webhook]"] });

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
      signature,
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

    // Dispatch event via JobDispatcher for async processing
    try {
      switch (event) {
        case WebhookEvents.APP_REVOKED: {
          if (!account_id) {
            log.warn("APP_REVOKED event missing account_id");
            return res.status(200).json({
              received: true,
              message: "Missing account_id",
            });
          }

          const appRevokedPayload: RazorpayAppRevokedJobData = {
            accountId: account_id,
            rawEvent: parsedBody,
          };

          const { jobName } = await dispatcher.dispatch({
            queue: QueueName.DEFAULT,
            name: JobName.RAZORPAY_APP_REVOKED_WEBHOOK,
            data: appRevokedPayload,
            bullmqOptions: {
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 3000,
              },
              removeOnComplete: {
                age: 86400, // 24 hours
                count: 100,
              },
              removeOnFail: {
                age: 604800, // 7 days
                count: 1000,
              },
            },
          });

          log.info(`Dispatched APP_REVOKED job for account: ${account_id}, jobName: ${jobName}`);
          break;
        }

        case WebhookEvents.PAYMENT_LINK_PAID: {
          const paymentId = parsedBody.payload?.payment?.entity?.id;
          const paymentLinkId = parsedBody.payload?.payment_link?.entity?.id;

          if (!paymentId || !paymentLinkId) {
            log.warn("PAYMENT_LINK_PAID event missing required data");
            return res.status(200).json({
              received: true,
              message: "Missing payment data",
            });
          }

          const paymentLinkPaidPayload: RazorpayPaymentLinkPaidJobData = {
            paymentId,
            paymentLinkId,
            rawEvent: parsedBody,
          };

          const { jobName } = await dispatcher.dispatch({
            queue: QueueName.DEFAULT,
            name: JobName.RAZORPAY_PAYMENT_LINK_PAID_WEBHOOK,
            data: paymentLinkPaidPayload,
            bullmqOptions: {
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 3000,
              },
              removeOnComplete: {
                age: 86400, // 24 hours
                count: 100,
              },
              removeOnFail: {
                age: 604800, // 7 days
                count: 1000,
              },
            },
          });

          log.info(`Dispatched PAYMENT_LINK_PAID job: ${paymentId}, jobName: ${jobName}`);
          break;
        }

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
    } catch (dispatchError) {
      // If dispatch fails, log but still acknowledge webhook to prevent Razorpay disabling it
      log.error("Failed to dispatch webhook event:", dispatchError);
      return res.status(200).json({
        received: true,
        message: "Webhook received but queuing failed",
      });
    }
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    log.error(`Webhook Error: ${err.message}`, { stack: err.stack });

    // Always return 200 to prevent webhook disabling
    return res.status(200).json({
      received: true,
      message: "Webhook received but processing failed",
      error: IS_PRODUCTION ? undefined : err.message,
    });
  }
}
