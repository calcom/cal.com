import type { NextApiRequest, NextApiResponse } from "next";

/**
 * LawPay Webhook Endpoint
 * -----------------------
 * Handles asynchronous payment events sent from LawPay (AffiniPay).
 * 
 * Configure this URL in your LawPay Developer Dashboard:
 * e.g. https://your-domain.com/api/integrations/lawpay/webhook
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // LawPay sends JSON data via POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // ✅ Step 1: Extract webhook body
    const event = req.body;

    // Optionally validate webhook signature (if LawPay provides it)
    // const signature = req.headers["x-lawpay-signature"];

    console.log("📩 LawPay Webhook Event Received:", event.type);

    // ✅ Step 2: Handle different event types
    switch (event.type) {
      case "charge.success":
        console.log("✅ Payment successful:", event.data);
        // Example: update booking status in your DB
        await markBookingPaid(event.data.transaction_id);
        break;

      case "charge.failed":
        console.log("❌ Payment failed:", event.data);
        await markBookingFailed(event.data.transaction_id);
        break;

      case "refund.processed":
        console.log("↩️ Refund processed:", event.data);
        await markBookingRefunded(event.data.transaction_id);
        break;

      default:
        console.log("ℹ️ Unhandled event:", event.type);
    }

    // ✅ Step 3: Respond to LawPay (must respond quickly)
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Example helper functions (you can later connect these to Cal.com’s database)
 */
async function markBookingPaid(transactionId: string) {
  // Example placeholder — replace with actual Cal.com DB logic
  console.log(`🟢 Marking booking as PAID for transaction: ${transactionId}`);
}

async function markBookingFailed(transactionId: string) {
  console.log(`🔴 Marking booking as FAILED for transaction: ${transactionId}`);
}

async function markBookingRefunded(transactionId: string) {
  console.log(`🟡 Marking booking as REFUNDED for transaction: ${transactionId}`);
}

// Disable body parsing if LawPay sends signed payloads (optional)
export const config = {
  api: {
    bodyParser: true, // set to false if validating raw signatures
  },
};
