import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";

import { handlePaymentSuccess } from "@calcom/app-store/_utils/payments/handlePaymentSuccess";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import { distributedTracing } from "@calcom/lib/tracing/factory";
import prisma from "@calcom/prisma";

import { appKeysSchema } from "../zod";
import { PaystackClient } from "../lib/PaystackClient";
import { verifyWebhookSignature } from "../lib/verifyWebhookSignature";

const log = logger.getSubLogger({ prefix: ["[paystackWebhook]"] });

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    }

    const requestBuffer = await buffer(req);
    const bodyString = requestBuffer.toString();

    // Parse body to get the reference (needed to find the credential for signature verification)
    let parsedBody: { event: string; data: { reference: string } };
    try {
      parsedBody = JSON.parse(bodyString);
    } catch {
      throw new HttpCode({ statusCode: 400, message: "Invalid JSON body" });
    }

    if (!parsedBody?.data?.reference) {
      throw new HttpCode({ statusCode: 400, message: "Missing reference in payload" });
    }

    const reference = parsedBody.data.reference;

    // Look up payment by reference to find the credential
    const payment = await prisma.payment.findFirst({
      where: { externalId: reference },
      select: {
        id: true,
        bookingId: true,
        success: true,
        booking: {
          select: {
            eventType: {
              select: {
                metadata: true,
              },
            },
            userId: true,
          },
        },
      },
    });

    if (!payment?.bookingId) {
      log.error("Payment not found for reference", { reference });
      throw new HttpCode({ statusCode: 204, message: "Payment not found" });
    }

    // Find the credential to verify the signature
    const metadata = payment.booking?.eventType?.metadata as Record<string, unknown> | null;
    const paystackAppData = (metadata?.apps as Record<string, unknown> | undefined)?.paystack as
      | { credentialId?: number }
      | undefined;

    const credentialQuery = paystackAppData?.credentialId
      ? { id: paystackAppData.credentialId }
      : { userId: payment.booking?.userId, appId: "paystack" as const };

    const credential = await prisma.credential.findFirst({
      where: credentialQuery,
      select: { key: true },
    });

    if (!credential) {
      log.error("Paystack credentials not found");
      throw new HttpCode({ statusCode: 500, message: "Missing payment credentials" });
    }

    const parsedKeys = appKeysSchema.safeParse(credential.key);
    if (!parsedKeys.success) {
      throw new HttpCode({ statusCode: 500, message: "Malformed credentials" });
    }

    // Verify webhook signature
    const signature = req.headers["x-paystack-signature"] as string | undefined;
    if (!signature || !verifyWebhookSignature(bodyString, signature, parsedKeys.data.secret_key)) {
      log.error("Invalid Paystack webhook signature");
      throw new HttpCode({ statusCode: 401, message: "Invalid signature" });
    }

    // Only handle charge.success events
    if (parsedBody.event !== "charge.success") {
      res.status(200).json({ message: `Unhandled event type: ${parsedBody.event}` });
      return;
    }

    // Atomic idempotency: only proceed if we can flip success from false to true
    const updated = await prisma.payment.updateMany({
      where: { id: payment.id, success: false },
      data: { success: true },
    });

    if (updated.count === 0) {
      // Another request already processed this payment
      res.status(200).json({ message: "Payment already processed" });
      return;
    }

    // Everything after the lock must rollback on failure so retries can re-process
    try {
      // Re-verify with Paystack API (belt and suspenders)
      const client = new PaystackClient(parsedKeys.data.secret_key);
      const verification = await client.verifyTransaction(reference);

      if (verification.status !== "success") {
        log.error("Paystack verification failed", { reference, status: verification.status });
        throw new HttpCode({ statusCode: 400, message: "Payment verification failed" });
      }

      // Confirm the booking
      const traceContext = distributedTracing.createTrace("paystack_webhook", {
        meta: { reference, bookingId: payment.bookingId },
      });

      await handlePaymentSuccess({
        paymentId: payment.id,
        bookingId: payment.bookingId,
        appSlug: "paystack",
        traceContext,
      });
    } catch (processingError) {
      // Rollback so webhook retries can re-process this payment
      await prisma.payment.update({
        where: { id: payment.id },
        data: { success: false },
      });
      throw processingError;
    }
  } catch (_err) {
    const err = getServerErrorFromUnknown(_err);
    log.error(`Webhook Error: ${err.message}`, safeStringify(err));
    res.status(err.statusCode).send({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.cause?.stack,
    });
    return;
  }

  res.status(200).json({ received: true });
}
