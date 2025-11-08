import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const event = req.body;

  // Verify webhook signature if LawPay provides one (optional)
  if (event.type === "charge.success") {
    console.log("✅ Payment succeeded:", event.data);
  } else if (event.type === "charge.failed") {
    console.log("❌ Payment failed:", event.data);
  }

  res.status(200).json({ received: true });
}
