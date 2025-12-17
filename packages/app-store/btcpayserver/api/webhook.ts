import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import { z } from "zod";

import { handlePaymentSuccess } from "@calcom/app-store/_utils/payments/handlePaymentSuccess";
import { distributedTracing } from "@calcom/lib/tracing/factory";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import { PrismaBookingPaymentRepository as BookingPaymentRepository } from "@calcom/lib/server/repository/PrismaBookingPaymentRepository";

import appConfig from "../config.json";
import { btcpayCredentialKeysSchema } from "../lib/btcpayCredentialKeysSchema";

export const config = { api: { bodyParser: false } };

function verifyBTCPaySignature(rawBody: Buffer, expectedSignature: string, webhookSecret: string): string {
  const hmac = crypto.createHmac("sha256", webhookSecret);
  hmac.update(rawBody);
  const computedSignature = hmac.digest("hex");
  const hexRegex = /^[0-9a-fA-F]+$/;
  if (!hexRegex.test(computedSignature) || !hexRegex.test(expectedSignature)) {
    throw new HttpCode({ statusCode: 400, message: "signature mismatch" });
  }
  return computedSignature;
}

const btcpayWebhookSchema = z.object({
  deliveryId: z.string(),
  webhookId: z.string(),
  originalDeliveryId: z.string().optional(),
  isRedelivery: z.boolean(),
  type: z.string(),
  timestamp: z.number(),
  storeId: z.string(),
  invoiceId: z.string(),
  metadata: z.object({}).optional(),
  manuallyMarked: z.boolean().optional(),
  overPaid: z.boolean(),
});
const SUPPORTED_INVOICE_EVENTS = ["InvoiceSettled", "InvoiceProcessing"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    const rawBody = await getRawBody(req);
    const bodyAsString = rawBody.toString();

    const signature = req.headers["btcpay-sig"] || req.headers["BTCPay-Sig"];
    if (!signature || typeof signature !== "string" || !signature.startsWith("sha256="))
      throw new HttpCode({ statusCode: 401, message: "Missing or invalid signature format" });

    const webhookData = btcpayWebhookSchema.safeParse(JSON.parse(bodyAsString));
    if (!webhookData.success) return res.status(400).json({ message: "Invalid webhook payload" });

    const data = webhookData.data;
    if (!SUPPORTED_INVOICE_EVENTS.includes(data.type))
      return res.status(200).send({ message: "Webhook received but ignored" });

    const bookingPaymentRepository = new BookingPaymentRepository();
    const payment = await bookingPaymentRepository.findByExternalIdIncludeBookingUserCredentials(
      data.invoiceId,
      appConfig.type
    );
    if (!payment) throw new HttpCode({ statusCode: 404, message: "Cal.com: payment not found" });
    if (payment.success) return res.status(200).send({ message: "Payment already registered" });
    const key = payment.booking?.user?.credentials?.[0].key;
    if (!key) throw new HttpCode({ statusCode: 404, message: "Cal.com: credentials not found" });

    const parsedKey = btcpayCredentialKeysSchema.safeParse(key);
    if (!parsedKey.success)
      throw new HttpCode({ statusCode: 400, message: "Cal.com: Invalid BTCPay credentials" });

    const { webhookSecret, storeId } = parsedKey.data;
    if (storeId !== data.storeId)
      throw new HttpCode({ statusCode: 400, message: "Cal.com: Store ID mismatch" });

    const expectedSignature = signature.split("=")[1];
    const computedSignature = verifyBTCPaySignature(rawBody, expectedSignature, webhookSecret);

    if (computedSignature.length !== expectedSignature.length) {
      throw new HttpCode({ statusCode: 400, message: "signature mismatch" });
    }
    const isValid = crypto.timingSafeEqual(
      Buffer.from(computedSignature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
    if (!isValid) throw new HttpCode({ statusCode: 400, message: "signature mismatch" });

    const traceContext = distributedTracing.createTrace("btcpayserver_webhook", {
      meta: { paymentId: payment.id, bookingId: payment.bookingId },
    });
    await handlePaymentSuccess(payment.id, payment.bookingId, traceContext);
    return res.status(200).json({ success: true });
  } catch (_err) {
    const err = getServerErrorFromUnknown(_err);
    return res.status(err.statusCode).send({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.cause?.stack,
    });
  }
}
