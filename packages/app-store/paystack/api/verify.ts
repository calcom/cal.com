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

    const reference = req.query.reference as string;
    if (!reference) {
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

    // Find credential
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
      throw new HttpCode({ statusCode: 500, message: "Missing payment credentials" });
    }

    const parsedKeys = appKeysSchema.safeParse(credential.key);
    if (!parsedKeys.success) {
      throw new HttpCode({ statusCode: 500, message: "Malformed credentials" });
    }

    // Verify with Paystack
    const client = new PaystackClient(parsedKeys.data.secret_key);
    const verification = await client.verifyTransaction(reference);

    if (verification.status !== "success") {
      res.status(200).json({ status: verification.status, message: "Payment not yet successful" });
      return;
    }

    // Confirm booking
    const traceContext = distributedTracing.createTrace("paystack_verify", {
      meta: { reference, bookingId: payment.bookingId },
    });

    await handlePaymentSuccess({
      paymentId: payment.id,
      bookingId: payment.bookingId,
      appSlug: "paystack",
      traceContext,
    });

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
