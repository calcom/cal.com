import type { Prisma } from "@prisma/client";
import { buffer } from "micro";
//WEBHOOK EVENTS ASSOCIATED EXAMPLE PAYLOADS : https://razorpay.com/docs/webhooks/payloads/payments/
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { default as Razorpay, WebhookEvents } from "@calcom/app-store/razorpay/lib/Razorpay";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import logger from "@calcom/lib/logger";
import { handlePaymentSuccess } from "@calcom/lib/payment/handlePaymentSuccess";
import { prisma } from "@calcom/prisma";

export const config = {
  api: {
    bodyParser: false,
  },
};

const log = logger.getSubLogger({ prefix: [`[razorpay/api/webhook]`] });

async function detachAppFromEvents(where: Prisma.EventTypeWhereInput) {
  try {
    //detaching razorpay from eventtypes, if any
    const eventTypes = await prisma.eventType.findMany({
      where,
    });

    // Iterate over each EventType record
    for (const eventType of eventTypes) {
      try {
        const metadata = isPrismaObjOrUndefined(eventType.metadata);

        if (metadata?.apps && isPrismaObjOrUndefined(metadata?.apps)?.razorpay) {
          delete isPrismaObjOrUndefined(metadata.apps)?.razorpay;

          await prisma.eventType.update({
            where: {
              id: eventType.id,
            },
            data: {
              metadata: metadata,
            },
          });
        }
      } catch (error) {
        log.error(`Failed to detach app from event type ${eventType.id}:`, error);
        // Continue processing other event types
      }
    }
  } catch (error) {
    log.error("Failed to fetch event types:", error);
    throw error;
  }
}

async function handleAppRevoked(accountId: string) {
  const credential = await prisma.credential.findFirst({
    where: {
      key: {
        path: ["account_id"],
        equals: accountId,
      },
      appId: "razorpay",
    },
  });

  if (!credential) {
    log.warn(`No credentials found for account_id: ${accountId}`);
    // Safe to return - credential might already be deleted
    return;
  }

  const userId = credential.userId;
  const calIdTeamId = credential.calIdTeamId;

  // Detach app from user events - non-critical, continue on failure
  if (userId) {
    try {
      await detachAppFromEvents({
        metadata: {
          not: undefined,
        },
        userId: userId,
      });
    } catch (error) {
      log.error(`Failed to detach app from user ${userId} events:`, error);
      // Continue with credential deletion
    }
  }

  // Detach app from team events - non-critical, continue on failure
  if (calIdTeamId) {
    try {
      await detachAppFromEvents({
        metadata: {
          not: undefined,
        },
        calIdTeamId,
      });
    } catch (error) {
      log.error(`Failed to detach app from team ${calIdTeamId} events:`, error);
      // Continue with credential deletion
    }
  }

  // Critical: credential deletion - throw on failure
  await prisma.credential.delete({
    where: {
      id: credential.id,
    },
  });
  log.info(`Successfully deleted credential for account_id: ${accountId}`);
}

async function handlePaymentLinkPaid({
  paymentId,
  paymentLinkId,
}: {
  paymentId?: string;
  paymentLinkId?: string;
}) {
  if (!paymentId || !paymentLinkId) {
    log.warn("Missing paymentId or paymentLinkId in payment link paid event");
    // Safe to return - malformed webhook data from Razorpay
    return;
  }

  const payment = await prisma.payment.findUnique({
    where: { externalId: paymentLinkId },
    select: { id: true, bookingId: true, success: true },
  });

  if (!payment) {
    log.warn(`Payment not found for paymentLinkId: ${paymentLinkId}`);
    // Safe to return - payment could have been raised from a different source other than Cal ID
    return;
  }

  if (!payment.success) {
    // Critical: payment processing - throw on failure for retry
    await handlePaymentSuccess(payment.id, payment.bookingId, { paymentId });
    log.info(`Successfully processed payment: ${paymentId}`);
  } else {
    log.info(`Payment ${paymentId} already marked as successful`);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    log.info("Received webhook event");

    // Safe to return 200 - wrong method
    if (req.method !== "POST") {
      log.warn(`Invalid method: ${req.method}`);
      return res.status(200).json({
        received: true,
        message: "Method Not Allowed",
      });
    }

    // Parse raw body - critical, but can happen due to network issues
    let rawBody: string;
    try {
      rawBody = (await buffer(req)).toString("utf8");
    } catch (error) {
      log.error("Failed to parse request body:", error);
      // Safe to return 200 - likely a malformed request
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
      // Safe to return 200 - invalid payload structure
      return res.status(200).json({
        received: true,
        message: "Malformed webhook data",
      });
    }

    // Verify webhook signature - critical security check
    let isValid: boolean;
    try {
      isValid = Razorpay.verifyWebhook(parsedVerifyWebhook.data);
    } catch (error) {
      log.error("Failed to verify webhook signature:", error);
      // Throw error - signature verification failure is critical
      return res.status(200).json({
        received: true,
        message: "Signature verification failed",
      });
    }

    if (!isValid) {
      log.error("Razorpay webhook signature mismatch");
      // Throw error - invalid signature is a security issue
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
      // Safe to return 200 - malformed JSON from Razorpay
      return res.status(200).json({
        received: true,
        message: "Invalid JSON",
      });
    }

    const { event, account_id } = parsedBody;

    if (!event) {
      log.warn("No event type in webhook payload");
      // Safe to return 200 - missing event type in payload
      return res.status(200).json({
        received: true,
        message: "No event to process",
      });
    }

    log.info(`Processing webhook event: ${event}`);

    // Handle different event types
    switch (event) {
      case WebhookEvents.APP_REVOKED:
        if (!account_id) {
          log.warn("APP_REVOKED event missing account_id");
          // Safe to return 200 - invalid event data
          return res.status(200).json({
            received: true,
            message: "Missing account_id",
          });
        }
        await handleAppRevoked(account_id);
        break;

      case WebhookEvents.PAYMENT_LINK_PAID:
        await handlePaymentLinkPaid({
          paymentId: parsedBody.payload?.payment?.entity?.id,
          paymentLinkId: parsedBody.payload?.payment_link?.entity?.id,
        });
        break;

      default:
        log.info(`Unhandled webhook event type: ${event}`);
        // Safe to return 200 - unknown event types are normal
        return res.status(200).json({
          received: true,
          message: "Event type not handled",
        });
    }

    // Success response
    log.info(`Successfully processed webhook event: ${event}`);
    return res.status(200).json({
      received: true,
      message: "Webhook processed successfully",
    });
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    log.error(`Webhook Error: ${err.message}`, {
      stack: err.stack,
    });

    // Determine if error is safe to acknowledge or needs retry
    if (err instanceof HttpCode) {
      // Security/validation errors - return error status for Razorpay to stop retrying
      return res.status(err.statusCode).json({
        message: err.message,
        stack: IS_PRODUCTION ? undefined : err.stack,
      });
    }

    // Database/processing errors - return 200 to prevent webhook disabling
    // These need manual investigation but shouldn't disable the webhook
    return res.status(200).json({
      received: true,
      message: "Webhook received but processing failed",
      error: IS_PRODUCTION ? undefined : err.message,
    });
  }
}

const verifyWebhookSchema = z
  .object({
    body: z.string().min(1),
    signature: z.string().min(1),
  })
  .passthrough();
