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

const log = logger.getSubLogger({ prefix: ["[paystackVerify]"] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    }

    const { reference } = req.query;
    if (typeof reference !== "string" || !reference) {
      throw new HttpCode({ statusCode: 400, message: "Missing reference parameter" });
    }

    const payment = await prisma.payment.findFirst({
      where: { externalId: reference },
      select: {
        id: true,
        bookingId: true,
        success: true,
        booking: {
          select: {
            eventType: {
              select: { metadata: true },
            },
            userId: true,
          },
        },
      },
    });

    if (!payment?.bookingId) {
      throw new HttpCode({ statusCode: 404, message: "Payment not found" });
    }

    // Already processed
    if (payment.success) {
      res.status(200).json({ status: "success", message: "Payment already confirmed" });
      return;
    }

    // Find credential. Fail closed if we have neither a specific credentialId nor a
    // concrete booking userId — otherwise a `{ userId: null }` fallback could match a
    // credential where userId IS NULL and silently use the wrong row.
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
      throw new HttpCode({ statusCode: 500, message: "Cannot resolve payment credentials" });
    }

    const credential = await prisma.credential.findFirst({
      where: credentialQuery,
      select: { key: true },
    });

    if (!credential) {
      throw new HttpCode({ statusCode: 500, message: "Missing payment credentials" });
    }

    const parsedKeys = appKeysSchema.safeParse(credential.key);
    if (!parsedKeys.success) {
      throw new HttpCode({ statusCode: 500, message: "Malformed credentials" });
    }

    // Verify with Paystack before claiming the idempotency lock
    const client = new PaystackClient(parsedKeys.data.secret_key);
    const verification = await client.verifyTransaction(reference);

    if (verification.status !== "success") {
      res.status(200).json({ status: verification.status, message: "Payment not yet successful" });
      return;
    }

    // Atomic idempotency lock: only one of webhook/verify can flip success false → true.
    // Without this, a webhook hitting at the same moment as the client redirect would let
    // both paths invoke handlePaymentSuccess and duplicate calendar events, BOOKING_PAID
    // webhooks, workflow runs, and confirmation emails.
    const claimed = await prisma.payment.updateMany({
      where: { id: payment.id, success: false },
      data: { success: true },
    });

    if (claimed.count === 0) {
      res.status(200).json({ status: "success", message: "Payment already confirmed" });
      return;
    }

    // Confirm booking — roll back the idempotency lock on failure so retries can re-process.
    //
    // handlePaymentSuccess uses an exception as its success signal: on a successful
    // confirmation it throws `new HttpCode({ statusCode: 200, message: ... })` rather
    // than returning. That means a 200-class HttpCode here is success — we leave
    // `payment.success: true` in place and swallow it. Anything else is a genuine
    // failure: undo the lock so a retry can re-run the confirmation, then rethrow
    // for the outer handler.
    try {
      const traceContext = distributedTracing.createTrace("paystack_verify", {
        meta: { reference, bookingId: payment.bookingId },
      });

      await handlePaymentSuccess({
        paymentId: payment.id,
        bookingId: payment.bookingId,
        appSlug: "paystack",
        traceContext,
      });
    } catch (processingError) {
      const isSuccessSentinel = processingError instanceof HttpCode && processingError.statusCode < 400;
      if (!isSuccessSentinel) {
        await prisma.payment.update({ where: { id: payment.id }, data: { success: false } });
        throw processingError;
      }
    }

    res.status(200).json({ status: "success", message: "Payment confirmed" });
  } catch (_err) {
    const err = getServerErrorFromUnknown(_err);
    log.error(`Verify Error: ${err.message}`, safeStringify(err));
    res.status(err.statusCode).json({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.cause?.stack,
    });
  }
}
