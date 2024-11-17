import crypto from "crypto";
import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";

import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handlePaymentSuccess(paymentId: string) {
  const payment = await prisma.payment.findFirst({
    where: {
      externalId: paymentId,
    },
    select: {
      id: true,
      booking: true,
    },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  // Update payment status
  await prisma.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      success: true,
    },
  });

  // Update booking status if needed
  if (payment.booking) {
    await prisma.booking.update({
      where: {
        id: payment.booking.id,
      },
      data: {
        status: "ACCEPTED",
      },
    });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      throw new HttpError({ statusCode: 405, message: "Method Not Allowed" });
    }

    const rawBody = await buffer(req);
    const signature = req.headers["x-razorpay-signature"];

    if (!signature || !process.env.RAZORPAY_WEBHOOK_SECRET) {
      throw new HttpError({ statusCode: 400, message: "Missing signature or webhook secret" });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      throw new HttpError({ statusCode: 400, message: "Invalid signature" });
    }

    const payload = JSON.parse(rawBody.toString());

    if (payload.event === "payment.captured") {
      await handlePaymentSuccess(payload.payload.payment.entity.order_id);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(err.statusCode ?? 500).json({
      message: err.message,
    });
  }
}
