import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import { z } from "zod";

import { handlePaymentSuccess } from "@calcom/app-store/_utils/payments/handlePaymentSuccess";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { ErrorWithCode } from "@calcom/lib/errors";
import { ErrorCode } from "@calcom/lib/errorCodes";
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
    throw new ErrorWithCode(ErrorCode.RequestBodyInvalid, "signature mismatch");
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
    if (req.method !== "POST") throw new ErrorWithCode(ErrorCode.InvalidOperation, "Method Not Allowed");
    const rawBody = await getRawBody(req);
    const bodyAsString = rawBody.toString();

    const signature = req.headers["btcpay-sig"] || req.headers["BTCPay-Sig"];
    if (!signature || typeof signature !== "string" || !signature.startsWith("sha256="))
      throw new ErrorWithCode(ErrorCode.Unauthorized, "Missing or invalid signature format");

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
    if (!payment) throw new ErrorWithCode(ErrorCode.ResourceNotFound, "Cal.com: payment not found");
    if (payment.success) return res.status(200).send({ message: "Payment already registered" });
    const key = payment.booking?.user?.credentials?.[0].key;
    if (!key) throw new ErrorWithCode(ErrorCode.ResourceNotFound, "Cal.com: credentials not found");

    const parsedKey = btcpayCredentialKeysSchema.safeParse(key);
    if (!parsedKey.success)
      throw new ErrorWithCode(ErrorCode.RequestBodyInvalid, "Cal.com: Invalid BTCPay credentials");

    const { webhookSecret, storeId } = parsedKey.data;
    if (storeId !== data.storeId)
      throw new ErrorWithCode(ErrorCode.RequestBodyInvalid, "Cal.com: Store ID mismatch");

    const expectedSignature = signature.split("=")[1];
    const computedSignature = verifyBTCPaySignature(rawBody, expectedSignature, webhookSecret);

    if (computedSignature.length !== expectedSignature.length) {
      throw new ErrorWithCode(ErrorCode.RequestBodyInvalid, "signature mismatch");
    }
    const isValid = crypto.timingSafeEqual(
      Buffer.from(computedSignature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
    if (!isValid) throw new ErrorWithCode(ErrorCode.RequestBodyInvalid, "signature mismatch");

    await handlePaymentSuccess(payment.id, payment.bookingId);
    return res.status(200).json({ success: true });
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    const statusCode = err instanceof ErrorWithCode ? 400 : 500;
    return res.status(statusCode).send({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.stack,
    });
  }
}
