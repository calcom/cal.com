import type { Prisma } from "@prisma/client";

import { HttpError as HttpCode } from "@calcom/lib/http-error";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import logger from "@calcom/lib/logger";
import { handlePaymentSuccess } from "@calcom/lib/payment/handlePaymentSuccess";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: [`[inngest/razorpay-webhooks]`] });

async function detachAppFromEvents(where: Prisma.EventTypeWhereInput) {
  try {
    const eventTypes = await prisma.eventType.findMany({
      where,
    });

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
      }
    }
  } catch (error) {
    log.error("Failed to fetch event types:", error);
    throw error;
  }
}

export const appRevokedHandler = async ({ event, step }) => {
  const { accountId } = event.data;

  log.info(`Processing APP_REVOKED for account: ${accountId}`);

  // Step 1: Find credential
  const credential = await step.run("find-credential", async () => {
    return await prisma.credential.findFirst({
      where: {
        key: {
          path: ["account_id"],
          equals: accountId,
        },
        appId: "razorpay",
      },
    });
  });

  if (!credential) {
    log.warn(`No credentials found for account_id: ${accountId}`);
    return { success: true, message: "Credential not found" };
  }

  const userId = credential.userId;
  const calIdTeamId = credential.calIdTeamId;

  // Step 2: Detach app from user events (non-critical)
  if (userId) {
    await step.run("detach-user-events", async () => {
      try {
        await detachAppFromEvents({
          metadata: {
            not: undefined,
          },
          userId: userId,
        });
        log.info(`Detached app from user ${userId} events`);
      } catch (error) {
        log.error(`Failed to detach app from user ${userId} events:`, error);
        // Don't throw - this is non-critical
      }
    });
  }

  // Step 3: Detach app from team events (non-critical)
  if (calIdTeamId) {
    await step.run("detach-team-events", async () => {
      try {
        await detachAppFromEvents({
          metadata: {
            not: undefined,
          },
          calIdTeamId,
        });
        log.info(`Detached app from team ${calIdTeamId} events`);
      } catch (error) {
        log.error(`Failed to detach app from team ${calIdTeamId} events:`, error);
        // Don't throw - this is non-critical
      }
    });
  }

  // Step 4: Delete credential (critical)
  await step.run("delete-credential", async () => {
    await prisma.credential.delete({
      where: {
        id: credential.id,
      },
    });
    log.info(`Successfully deleted credential for account_id: ${accountId}`);
  });

  return {
    success: true,
    message: `Successfully revoked app for account: ${accountId}`,
  };
};

export const paymentLinkPaidHandler = async ({ event, step }) => {
  const { paymentId, paymentLinkId } = event.data;

  if (!paymentId || !paymentLinkId) {
    log.warn("Missing paymentId or paymentLinkId in payment link paid event");
    return { success: false, message: "Missing required data" };
  }

  log.info(`Processing PAYMENT_LINK_PAID: ${paymentId}`);

  // Step 1: Find payment
  const payment = await step.run("find-payment", async () => {
    return await prisma.payment.findUnique({
      where: { externalId: paymentLinkId },
      select: { id: true, bookingId: true, success: true },
    });
  });

  if (!payment) {
    log.warn(`Payment not found for paymentLinkId: ${paymentLinkId}`);
    return { success: false, message: "Payment not found" };
  }

  // Process payment if not already successful
  if (!payment.success) {
    await step.run(
      "process-payment",
      async () => {
        await handlePaymentSuccess(payment.id, payment.bookingId, { paymentId });
        log.info(`Successfully processed payment: ${paymentId}`);
      },
      {
        retries: {
          custom: (err: any) => {
            if (err instanceof HttpCode && err.statusCode === 200) {
              return false;
            }
            return true;
          },
        },
      }
    );

    return {
      success: true,
      message: `Payment ${paymentId} processed successfully`,
    };
  } else {
    log.info(`Payment ${paymentId} already marked as successful`);
    return {
      success: true,
      message: `Payment ${paymentId} already successful`,
    };
  }
};
