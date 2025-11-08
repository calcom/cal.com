// File: apps/web/pages/api/integrations/lawpay/webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as crypto from "crypto";

// Explicitly tell TypeScript that req is an async iterable of Buffers
interface AsyncIterableRequest extends NextApiRequest {
  [Symbol.asyncIterator](): AsyncIterableIterator<Buffer>;
}

export const config = {
  api: {
    bodyParser: false, // ✅ required for raw body verification
  },
};

// ✅ Safely read raw body without `any`
const getRawBody = async (req: AsyncIterableRequest): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const raw = await getRawBody(req as AsyncIterableRequest);
    const signatureHeader = (req.headers["x-lawpay-signature"] as string) || "";
   

    // ✅ HMAC verification
    const expectedSig = crypto.createHmac("sha256", webhookSecret).update(raw).digest("hex");
    const sigBuffer = Buffer.from(signatureHeader, "utf8");
    const expectedBuffer = Buffer.from(expectedSig, "utf8");
    const validSignature =
      signatureHeader &&
      sigBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, expectedBuffer);

    if (!validSignature) {
      console.warn("Invalid LawPay webhook signature.");
      return res.status(400).end("Invalid signature");
    }

    const event = JSON.parse(raw.toString("utf8"));

    // ✅ Log only minimal, non-sensitive metadata
    const transactionId = event?.data?.transaction_id || event?.data?.id || null;
    const status = event?.data?.status || null;
    console.log(
      `📩 LawPay webhook received: type=${event.type}${transactionId ? ` tx=${transactionId}` : ""}${
        status ? ` status=${status}` : ""
      }`
    );

    switch (event.type) {
      case "charge.success":
        // await markBookingPaid(transactionId);
        break;
      case "charge.failed":
        // await markBookingFailed(transactionId);
        break;
      case "refund.processed":
        // await markBookingRefunded(transactionId);
        break;
      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Webhook processing error (sanitized):", error.message);
    } else {
      console.error("Webhook processing error (sanitized): Unknown error");
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
