import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import { z } from "zod";

import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import { handlePaymentSuccess } from "@calcom/lib/payment/handlePaymentSuccess";
import prisma from "@calcom/prisma";

import appConfig from "../config.json";
import type { btcpayCredentialKeysSchema } from "../lib/btcpayCredentialKeysSchema";

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
});

const SUPPORTED_INVOICE_EVENTS = [
  "InvoiceSettled",
  "InvoicePaymentSettled",
  "InvoiceReceivedPayment",
  "InvoiceProcessing",
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });

    let bodyString: string;
    let rawBody: Buffer;
    if (req.body && typeof req.body === "object") {
      bodyString = JSON.stringify(req.body);
      rawBody = Buffer.from(bodyString);
    } else {
      rawBody = await getRawBody(req);
      bodyString = rawBody.toString();
    }

    const signature = req.headers["btcpay-sig"] || req.headers["BTCPay-Sig"];
    if (!signature || typeof signature !== "string" || !signature.startsWith("sha256="))
      throw new HttpCode({ statusCode: 401, message: "Missing or invalid signature format" });

    const webhookData = btcpayWebhookSchema.safeParse(JSON.parse(bodyString));
    if (!webhookData.success) return res.status(400).json({ message: "Invalid webhook payload" });

    const data = webhookData.data;
    if (!SUPPORTED_INVOICE_EVENTS.includes(data.type))
      return res.status(200).send({ message: "Webhook received but ignored" });
    const payment = await prisma.payment.findFirst({
      where: {
        externalId: data.invoiceId,
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
                    type: appConfig.type,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) throw new HttpCode({ statusCode: 204, message: "Payment not found" });
    const key = payment.booking?.user?.credentials?.[0].key;
    if (!key) throw new HttpCode({ statusCode: 204, message: "Credentials not found" });
    const { storeId } = key as z.infer<typeof btcpayCredentialKeysSchema>;
    if (storeId !== data.storeId) throw new HttpCode({ statusCode: 400, message: "Store ID mismatch" });

    console.log("Payment recorded");
    await handlePaymentSuccess(payment.id, payment.bookingId);
    return res.status(200).json({ success: true });
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    console.error(`Webhook Error: ${err.message}`);
    return res.status(200).send({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.stack,
    });
  }
}
