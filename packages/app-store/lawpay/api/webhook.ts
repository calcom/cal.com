import { handlePaymentSuccess } from "@calcom/app-store/_utils/payments/handlePaymentSuccess";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { distributedTracing } from "@calcom/lib/tracing/factory";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import appConfig from "../config.json";
import { LawPayAPI } from "../lib/LawPayAPI";
import { lawPayCredentialSchema } from "../types";

const log = logger.getSubLogger({ prefix: ["lawpay", "webhook"] });

type LawPayWebhookEvent = {
  type?: string;
  id?: string;
  data: { object: Record<string, unknown> };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  if (method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const rawBody = await getRawBody(req);
    const bodyAsString = rawBody.toString();

    const signature = req.headers["x-lawpay-signature"] as string;
    if (!signature) {
      log.error("Missing webhook signature");
      return res.status(400).json({ message: "Missing webhook signature" });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyAsString);
    } catch {
      log.error("Invalid webhook body: not JSON");
      return res.status(400).json({ message: "Invalid webhook body" });
    }

    const event = parsed as LawPayWebhookEvent;
    const merchantId =
      event.data?.object && typeof event.data.object.account_id === "string"
        ? event.data.object.account_id
        : undefined;
    if (!merchantId) {
      log.error("Missing merchant ID in webhook payload");
      return res.status(400).json({ message: "Missing merchant ID" });
    }

    // Find the credential to get webhook secret
    const credential = await prisma.credential.findFirst({
      where: {
        type: "lawpay_payment",
        key: {
          path: ["merchant_id"],
          equals: merchantId,
        },
      },
      select: {
        key: true,
      },
    });

    if (!credential) {
      log.error("No LawPay credential found");
      return res.status(400).json({ message: "No LawPay credential found" });
    }

    const credentialData = lawPayCredentialSchema.parse(credential.key);
    const api = new LawPayAPI(credentialData);

    // Verify webhook signature using raw body (must match exactly what LawPay signed)
    const isValid = api.verifyWebhookSignature(bodyAsString, signature);
    if (!isValid) {
      log.error("Invalid webhook signature");
      return res.status(400).json({ message: "Invalid webhook signature" });
    }
    log.info("Received webhook event", { type: event.type, id: event.id });

    // Process the webhook event
    switch (event.type) {
      case "charge.succeeded":
        await handleChargeSucceeded(event);
        break;
      case "charge.failed":
        await handleChargeFailed(event);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event);
        break;
      default:
        log.warn("Unhandled webhook event type", { type: event.type });
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    log.error("Error processing webhook", getErrorFromUnknown(error));
    res.status(500).json({ message: "Internal server error" });
  }
}

async function handleChargeSucceeded(event: { data: { object: Record<string, unknown> } }) {
  const charge = event.data.object;
  if (typeof charge.id !== "string") {
    log.error("Invalid charge ID in webhook payload");
    return;
  }
  log.info("Charge succeeded", { chargeId: charge.id, amount: charge.amount });

  const payment = await prisma.payment.findFirst({
    where: {
      externalId: charge.id,
      appId: "lawpay",
    },
    select: {
      id: true,
      bookingId: true,
    },
  });

  if (!payment?.bookingId) {
    log.error("Payment not found or missing bookingId", { externalId: charge.id });
    return;
  }

  const traceContext = distributedTracing.createTrace("lawpay_webhook", {
    meta: { paymentId: payment.id, bookingId: payment.bookingId },
  });
  await handlePaymentSuccess({
    paymentId: payment.id,
    bookingId: payment.bookingId,
    appSlug: appConfig.slug,
    traceContext,
  });
}

async function handleChargeFailed(event: { data: { object: Record<string, unknown> } }) {
  const charge = event.data.object;
  if (typeof charge.id !== "string") {
    log.error("Invalid charge ID in webhook payload");
    return;
  }
  log.info("Charge failed", { chargeId: charge.id, amount: charge.amount });

  // Update payment status in database
  await prisma.payment.updateMany({
    where: {
      externalId: charge.id,
      appId: "lawpay",
    },
    data: {
      success: false,
      data: charge as unknown as Prisma.InputJsonValue,
    },
  });
}

async function handleChargeRefunded(event: { data: { object: Record<string, unknown> } }) {
  const charge = event.data.object;
  if (typeof charge.id !== "string") {
    log.error("Invalid charge ID in webhook payload");
    return;
  }
  log.info("Charge refunded", { chargeId: charge.id, amount: charge.amount });

  // Update payment status in database
  await prisma.payment.updateMany({
    where: {
      externalId: charge.id,
      appId: "lawpay",
    },
    data: {
      refunded: true,
      data: charge as unknown as Prisma.InputJsonValue,
    },
  });
}
