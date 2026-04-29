/**
 * api/webhook.ts
 *
 * Route: POST /api/integrations/waylpayment/webhook
 *
 * Wayl POSTs to this URL when a customer completes payment.
 * - Verifies the request signature using the per-payment webhookSecret
 *   (stored in Payment.data when the link was created)
 * - Confirms the booking: PENDING → ACCEPTED, Payment.success = true
 *
 * Signature header: x-wayl-signature-256
 * Signature algorithm: HMAC-SHA256(webhookSecret, rawBody) → hex
 */
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import type { WaylWebhookPayload } from "../lib/WaylClient";
import type { WaylPaymentData } from "../lib/PaymentService";

/** Disable Next.js body parsing — we need the raw body string for HMAC verification */
export const config = { api: { bodyParser: false } };

const MAX_BODY_BYTES = 100 * 1024; // 100 KB — Wayl webhook payloads are small

async function getRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    req.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error("Request body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

/**
 * Verify HMAC-SHA256 signature.
 * secret  = the webhookSecret we sent when creating the Wayl link
 * data    = raw request body string
 * signature = value from x-wayl-signature-256 header
 */
function verifySignature(data: string, signature: string, secret: string): boolean {
  const calculated = crypto.createHmac("sha256", secret).update(data).digest("hex");

  const sigBuffer  = Buffer.from(signature,  "hex");
  const calcBuffer = Buffer.from(calculated, "hex");

  if (sigBuffer.length !== calcBuffer.length) return false;
  return crypto.timingSafeEqual(sigBuffer, calcBuffer);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  let rawBody: string;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    return res.status(413).json({ message: "Request body too large" });
  }

  let payload: WaylWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ message: "Invalid JSON body" });
  }

  const { referenceId, event } = payload;

  if (!referenceId) {
    return res.status(400).json({ message: "Missing referenceId in payload" });
  }

  // ── Look up the booking and its payment record ───────────────────────────
  const booking = await prisma.booking.findUnique({
    where: { uid: referenceId },
    include: { payment: true },
  });

  if (!booking) {
    // Return 200 — booking may have been deleted; don't trigger Wayl retries
    console.warn(`[WaylWebhook] Booking not found for referenceId: ${referenceId}`);
    return res.status(200).json({ message: "Booking not found — ignoring" });
  }

  const payment = booking.payment[0];
  if (!payment) {
    console.warn(`[WaylWebhook] No payment record for booking UID: ${referenceId}`);
    return res.status(200).json({ message: "No payment record — ignoring" });
  }

  // ── Verify signature using the per-payment webhookSecret ──────────────────
  // webhookSecret is retained in Payment.data even after success so that
  // legitimate Wayl retries can always be verified. Never skip verification —
  // doing so would create an unauthenticated payment-state oracle.
  const paymentData = payment.data as WaylPaymentData | null;
  const webhookSecret = paymentData?.webhookSecret;

  if (!webhookSecret) {
    console.error(`[WaylWebhook] No webhookSecret found for booking ${referenceId} — rejecting`);
    return res.status(401).json({ message: "Cannot verify request — missing webhook secret" });
  }

  const signature = req.headers["x-wayl-signature-256"] as string | undefined;
  if (!signature || !verifySignature(rawBody, signature, webhookSecret)) {
    console.warn(`[WaylWebhook] Invalid signature for booking ${referenceId}`);
    return res.status(401).json({ message: "Invalid signature" });
  }

  // ── Idempotency check — runs after signature is verified ─────────────────
  if (payment.success) {
    return res.status(200).json({ message: "Already processed" });
  }

  // ── Handle successful payment ─────────────────────────────────────────────
  // Wayl sends event = "order.created" when payment is complete
  if (event === "order.created") {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          success: true,
          data: {
            ...(paymentData ?? {}),
            waylPaymentMethod: payload.paymentMethod,
            waylPaymentProcessor: payload.paymentProcessor,
            waylOrderCode: payload.code,
            waylInternalId: payload.id,
            // webhookSecret is intentionally kept — required to verify Wayl retries
          },
        },
      }),
      prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.ACCEPTED },
      }),
    ]);

    console.log(`[WaylWebhook] Booking ${referenceId} confirmed after Wayl payment`);
    return res.status(200).json({ message: "Booking confirmed" });
  }

  // Any other event — acknowledge so Wayl doesn't retry
  console.log(`[WaylWebhook] Unhandled event '${event}' for booking ${referenceId}`);
  return res.status(200).json({ message: `Event '${event}' acknowledged` });
}
