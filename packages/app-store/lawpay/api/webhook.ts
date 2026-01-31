import type { NextApiRequest, NextApiResponse } from "next";

import { getErrorFromUnknown } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import { LawPayAPI } from "../lib/LawPayAPI";
import { lawPayCredentialSchema } from "../types";

const log = logger.getSubLogger({ prefix: ["lawpay", "webhook"] });

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  if (method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const signature = req.headers["x-lawpay-signature"] as string;
    const body = JSON.stringify(req.body);

    if (!signature) {
      log.error("Missing webhook signature");
      return res.status(400).json({ message: "Missing webhook signature" });
    }

    const merchantId = req.body?.data?.object?.account_id as string;

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

    // Verify webhook signature
    const isValid = api.verifyWebhookSignature(body, signature);
    if (!isValid) {
      log.error("Invalid webhook signature");
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = req.body;
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

  // Update payment status in database
  await prisma.payment.updateMany({
    where: {
      externalId: charge.id,
    },
    data: {
      success: true,
      data: charge,
    },
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
    },
    data: {
      success: false,
      data: charge,
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
    },
    data: {
      refunded: true,
      data: charge,
    },
  });
}
