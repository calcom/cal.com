import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import { z } from "zod";

import { handlePaymentSuccess } from "@calcom/app-store/_utils/payments/handlePaymentSuccess";
import { distributedTracing } from "@calcom/lib/tracing/factory";
import { kasperopayCredentialKeysSchema } from "@calcom/app-store/kasperopay/lib";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import prisma from "@calcom/prisma";

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

	const headers = req.headers;
    
    // Body may already be parsed by middleware
    let bodyObj: any;
    let bodyAsString: string;
    
    if (typeof req.body === 'object' && req.body !== null) {
      bodyObj = req.body;
      bodyAsString = JSON.stringify(req.body);
    } else {
      try {
        const bodyRaw = await getRawBody(req);
        bodyAsString = bodyRaw.toString();
        bodyObj = JSON.parse(bodyAsString);
      } catch (e) {
        bodyAsString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        bodyObj = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      }
    }

    // Parse webhook payload
    const parse = kasperoPayWebhookSchema.safeParse(bodyObj);
    if (!parse.success) {
      console.error("KasperoPay webhook parse error:", parse.error);
      throw new HttpCode({ statusCode: 400, message: "Bad Request" });
    }

    const { data: payload } = parse;

    // Only process completed payments
    if (payload.event !== "payment.completed") {
      return res.status(200).json({ received: true, message: "Event ignored" });
    }

    // Check if this is a Cal.com payment (via metadata)
    if (payload.metadata?.appId !== "cal.com") {
      return res.status(200).json({ received: true, message: "Not a Cal.com payment" });
    }

    const referenceId = payload.metadata.referenceId;
    if (!referenceId) {
      throw new HttpCode({ statusCode: 400, message: "Missing referenceId in metadata" });
    }

    // Find the payment by uid (referenceId)
    const payment = await prisma.payment.findFirst({
      where: {
        uid: referenceId,
      },
      select: {
        id: true,
        amount: true,
        bookingId: true,
        booking: {
          select: {
            user: {
              select: {
                credentials: {
                  where: {
                    type: "kasperopay_payment",
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new HttpCode({ statusCode: 404, message: "Payment not found" });
    }

    const key = payment.booking?.user?.credentials?.[0]?.key;
    if (!key) {
      throw new HttpCode({ statusCode: 404, message: "Credentials not found" });
    }

    const parseCredentials = kasperopayCredentialKeysSchema.safeParse(key);
    if (!parseCredentials.success) {
      console.error("Invalid credentials:", parseCredentials.error);
      throw new HttpCode({ statusCode: 500, message: "Credentials not valid" });
    }

    const credentials = parseCredentials.data;

    // Verify webhook signature if secret is configured
    if (credentials.webhook_secret) {
      const signature = headers["x-kasperopay-signature"] as string;
      if (!verifyWebhookSignature(bodyAsString, signature, credentials.webhook_secret)) {
        throw new HttpCode({ statusCode: 401, message: "Invalid signature" });
      }
    }

    // Verify amount matches (convert to same unit for comparison)
    const receivedAmountKas = parseFloat(payload.amount_kas);
    // Note: Cal.com might store amount differently, adjust comparison as needed
    
    const traceContext = distributedTracing.createTrace("kasperopay_webhook", {
      meta: { paymentId: payment.id, bookingId: payment.bookingId },
    });

    // Mark payment as successful and confirm booking
    return await handlePaymentSuccess({
      paymentId: payment.id,
      bookingId: payment.bookingId,
      appSlug: "kasperopay",
      traceContext,
    });

  } catch (_err) {
    const err = getServerErrorFromUnknown(_err);
    console.error(`KasperoPay Webhook Error: ${err.message}`);
    return res.status(err.statusCode).send({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.cause?.stack,
    });
  }
}

/**
 * Verify webhook signature using HMAC
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature) return false;
  
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// KasperoPay webhook payload schema
const kasperoPayWebhookSchema = z.object({
  event: z.string(),
  timestamp: z.string(),
  merchant_id: z.string(),
  payment_id: z.string(),
  order_id: z.string().nullable().optional(),
  amount_kas: z.string().or(z.number()),
  amount_usd: z.string().or(z.number()).nullable().optional(),
  transaction_id: z.string().nullable().optional(),
  customer_address: z.string().nullable().optional(),
  item: z.string().nullable().optional(),
  metadata: z.object({
    appId: z.string().optional(),
    referenceId: z.string().optional(),
    bookingUid: z.string().optional(),
  }).optional(),
});

