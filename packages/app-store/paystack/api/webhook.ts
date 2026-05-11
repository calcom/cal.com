import { handlePaymentSuccess } from "@calcom/app-store/_utils/payments/handlePaymentSuccess";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import { distributedTracing } from "@calcom/lib/tracing/factory";
import prisma from "@calcom/prisma";
import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";
import { PaystackClient } from "../lib/PaystackClient";
import { verifyWebhookSignature } from "../lib/verifyWebhookSignature";
import { appKeysSchema } from "../zod";

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
      // Unknown reference (e.g. test events from the Paystack dashboard, or a
      // payment that was deleted on our side). Ack with 200 so Paystack stops
      // retrying, and skip the noisy error log.
      log.warn("Webhook for unknown payment reference; acknowledging", { reference });
      res.status(200).json({ message: "Unknown reference, acknowledged" });
      return;
    }

    // Find the credential to verify the signature. Fail closed if we have neither a
    // specific credentialId nor a concrete booking userId — otherwise a
    // `{ userId: null }` fallback could match a credential where userId IS NULL and
    // we'd verify the signature against the wrong secret.
    const metadata = payment.booking?.eventType?.metadata as Record<string, unknown> | null;
    const paystackAppData = (metadata?.apps as Record<string, unknown> | undefined)?.paystack as
      | { credentialId?: number }
      | undefined;

    let credentialQuery: { id: number } | { userId: number; appId: "paystack" };
    if (paystackAppData?.credentialId) {
      credentialQuery = { id: paystackAppData.credentialId };
    } else if (payment.booking?.userId) {
      credentialQuery = { userId: payment.booking.userId, appId: "paystack" };
    } else {
      log.error("Cannot resolve Paystack credentials for webhook");
      throw new HttpCode({ statusCode: 500, message: "Cannot resolve payment credentials" });
    }

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
      // handlePaymentSuccess signals success by throwing HttpCode(200). Treat that as a
      // successful confirmation (the booking is already finalized), don't roll back the
      // idempotency lock, and don't re-throw — re-throwing would surface the success
      // sentinel in the outer catch as a "Webhook Error" log line on every happy path.
      const isSuccessSentinel = processingError instanceof HttpCode && processingError.statusCode < 400;
      if (isSuccessSentinel) {
        // Fall through to the 200 response below.
      } else {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { success: false },
        });
        throw processingError;
      }
    }
  } catch (_err) {
    const err = getServerErrorFromUnknown(_err);
    log.error(`Webhook Error: ${err.message}`, safeStringify(err));
    // Avoid sending a body on 204 (RFC 7230 §3.3.3 forbids it). For any other status,
    // include the error message so observability tooling can see the failure.
    if (err.statusCode === 204) {
      res.status(204).end();
    } else {
      res.status(err.statusCode).send({
        message: err.message,
        stack: IS_PRODUCTION ? undefined : err.cause?.stack,
      });
    }
    return;
  }

  res.status(200).json({ received: true });
}
