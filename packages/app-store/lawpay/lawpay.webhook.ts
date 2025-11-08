// File: apps/web/pages/api/integrations/lawpay/webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as crypto from "crypto";

// Define Next.js API config (renamed to avoid naming conflicts)
export const apiConfig = {
  api: {
    bodyParser: false, // ✅ required for raw body verification
  },
};

// Explicitly tell TypeScript that req is an async iterable of Buffers
interface AsyncIterableRequest extends NextApiRequest {
  [Symbol.asyncIterator](): AsyncIterableIterator<Buffer>;
}

// ✅ Safely read raw body
const getRawBody = async (req: AsyncIterableRequest): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

// ✅ Helper to log minimal, non-sensitive info
const logLawPayEvent = (type: string, tx: string | null, status?: string) => {
  const txId = tx || "unknown";
  const state = status ? `, status=${status}` : "";
  console.log(`📩 LawPay event verified: type=${type}, tx=${txId}${state}`);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // ✅ Step 1: Get raw body
    const raw = await getRawBody(req as AsyncIterableRequest);

    // ✅ Step 2: Extract signature and secret
    const signatureHeader = req.headers["x-lawpay-signature"] as string | undefined;
    const webhookSecret = config.lawpay.webhookSecret;
    if (!webhookSecret) {
      console.error("⚠️ LAWPAY_WEBHOOK_SECRET not configured.");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    if (!signatureHeader) {
      console.warn("⚠️ Missing LawPay signature header.");
      return res.status(400).json({ error: "Missing signature header" });
    }

    // ✅ Step 3: Verify signature authenticity
    const expectedSig = crypto.createHmac("sha256", webhookSecret).update(raw).digest("hex");
    const sigBuffer = Buffer.from(signatureHeader, "utf8");
    const expectedBuffer = Buffer.from(expectedSig, "utf8");

    const validSignature =
      sigBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, expectedBuffer);

    if (!validSignature) {
      console.warn("❌ Invalid LawPay webhook signature.");
      return res.status(400).end("Invalid signature");
    }

    // ✅ Step 4: Parse event safely
    const event = JSON.parse(raw.toString("utf8"));
    const transactionId = event?.data?.transaction_id || event?.data?.id || null;
    const status = event?.data?.status || "unspecified";

    // ✅ Sanitize and log minimal info
    logLawPayEvent(event.type, transactionId, status);

    // ✅ Step 5: Handle event types
    switch (event.type) {
      case "charge.success":
        console.log(`✅ LawPay payment succeeded: tx=${transactionId}`);
        // await markBookingPaid(transactionId);
        break;

      case "charge.failed":
        console.warn(`❌ LawPay payment failed: tx=${transactionId}`);
        // await markBookingFailed(transactionId);
        break;

      case "refund.processed":
        console.log(`↩️ LawPay refund processed: tx=${transactionId}`);
        // await markBookingRefunded(transactionId);
        break;

      default:
        console.log(`ℹ️ Unhandled LawPay event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook processing error (sanitized):", message);
    return res.status(500).json({ error: "Internal server error" });
  }
}
