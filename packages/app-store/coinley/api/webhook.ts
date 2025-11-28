import type { NextApiRequest, NextApiResponse } from "next";
import { buffer } from "micro";
import crypto from "crypto";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

// Disable body parser to access raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Verify webhook signature from Coinley
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    const digest = hmac.digest("hex");

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch (error) {
    console.error("[Coinley Webhook] Signature verification error:", error);
    return false;
  }
}

/**
 * Webhook handler for Coinley payment events
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get raw body
    const buf = await buffer(req);
    const payload = buf.toString("utf8");

    // Verify signature
    const signature = req.headers["x-coinley-signature"] as string;
    const webhookSecret = process.env.COINLEY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[Coinley Webhook] Webhook secret not configured");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    if (!signature || !verifyWebhookSignature(payload, signature, webhookSecret)) {
      console.error("[Coinley Webhook] Invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Parse event
    const event = JSON.parse(payload);

    console.log("[Coinley Webhook] Received event:", event.type, event.data?.paymentId);

    // Route to appropriate handler
    switch (event.type) {
      case "payment.pending":
        await handlePaymentPending(event);
        break;

      case "payment.confirmed":
        await handlePaymentConfirmed(event);
        break;

      case "payment.failed":
        await handlePaymentFailed(event);
        break;

      case "payment.refunded":
        await handlePaymentRefunded(event);
        break;

      default:
        console.log("[Coinley Webhook] Unhandled event type:", event.type);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[Coinley Webhook] Error processing webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Handle payment pending event (transaction submitted to blockchain)
 */
async function handlePaymentPending(event: { data: { paymentId: string; transactionHash?: string; network?: string; blockNumber?: number } }) {
  const { paymentId, transactionHash, network, blockNumber } = event.data;

  // Find payment in database
  const payment = await prisma.payment.findUnique({
    where: { externalId: paymentId },
    select: {
      id: true,
      data: true,
      bookingId: true,
    },
  });

  if (!payment) {
    console.error("[Coinley Webhook] Payment not found:", paymentId);
    return;
  }

  // Update payment with transaction details
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      data: {
        ...(payment.data as object),
        transactionHash,
        status: "pending",
        network,
        blockNumber,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  console.log("[Coinley Webhook] Payment pending:", {
    paymentId,
    transactionHash,
    bookingId: payment.bookingId,
  });
}

/**
 * Handle payment confirmed event (transaction confirmed on blockchain)
 */
async function handlePaymentConfirmed(event: { data: { paymentId: string; transactionHash?: string; confirmations?: number; network?: string; blockNumber?: number; metadata?: { bookingId?: string } } }) {
  const { paymentId, transactionHash, confirmations, network, blockNumber, metadata } = event.data;

  // Find payment in database by externalId OR by bookingId from metadata
  let payment = await prisma.payment.findUnique({
    where: { externalId: paymentId },
    select: {
      id: true,
      data: true,
      bookingId: true,
    },
  });

  // If payment not found by externalId, try finding by booking metadata
  if (!payment && metadata?.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(metadata.bookingId) },
      select: {
        payment: {
          select: {
            id: true,
            data: true,
            bookingId: true,
          },
        },
      },
    });

    if (booking?.payment?.[0]) {
      payment = booking.payment[0];
    }
  }

  if (!payment) {
    console.error("[Coinley Webhook] Payment not found:", paymentId, metadata);
    return;
  }

  // Update payment status and externalId
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      success: true,
      externalId: paymentId, // Update externalId to match SDK payment
      data: {
        ...(payment.data as object),
        transactionHash,
        status: "confirmed",
        confirmations,
        network,
        blockNumber,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  // Update booking status
  await prisma.booking.update({
    where: { id: payment.bookingId },
    data: {
      paid: true,
      status: "ACCEPTED",
    },
  });

  console.log("[Coinley Webhook] Payment confirmed:", {
    paymentId,
    transactionHash,
    bookingId: payment.bookingId,
    confirmations,
  });

  // TODO: Trigger Cal.com webhooks
  // TODO: Send booking confirmation email
}

/**
 * Handle payment failed event
 */
async function handlePaymentFailed(event: { data: { paymentId: string; reason?: string } }) {
  const { paymentId, reason } = event.data;

  const payment = await prisma.payment.findUnique({
    where: { externalId: paymentId },
    select: {
      id: true,
      data: true,
      bookingId: true,
    },
  });

  if (!payment) {
    console.error("[Coinley Webhook] Payment not found:", paymentId);
    return;
  }

  // Update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      success: false,
      data: {
        ...(payment.data as object),
        status: "failed",
        failureReason: reason,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  // Cancel booking
  await prisma.booking.update({
    where: { id: payment.bookingId },
    data: {
      status: "CANCELLED",
      cancellationReason: `Payment failed: ${reason}`,
    },
  });

  console.log("[Coinley Webhook] Payment failed:", {
    paymentId,
    reason,
    bookingId: payment.bookingId,
  });

  // TODO: Send failure notification email
}

/**
 * Handle payment refunded event
 */
async function handlePaymentRefunded(event: { data: { paymentId: string; refundTransactionHash?: string; refundAmount?: number } }) {
  const { paymentId, refundTransactionHash, refundAmount } = event.data;

  const payment = await prisma.payment.findUnique({
    where: { externalId: paymentId },
    select: {
      id: true,
      data: true,
    },
  });

  if (!payment) {
    console.error("[Coinley Webhook] Payment not found:", paymentId);
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      refunded: true,
      data: {
        ...(payment.data as object),
        status: "refunded",
        refundTransactionHash,
        refundAmount,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  console.log("[Coinley Webhook] Payment refunded:", {
    paymentId,
    refundTransactionHash,
  });

  // TODO: Send refund confirmation email
}
