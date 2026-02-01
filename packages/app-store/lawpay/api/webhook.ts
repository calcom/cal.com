import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

const webhookSchema = z.object({
  event_type: z.string(),
  payment_id: z.string(),
  status: z.enum(["succeeded", "failed", "pending", "refunded"]),
  amount: z.number(),
  currency: z.string(),
  metadata: z.object({
    booking_id: z.string().optional(),
  }).optional(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    throw new HttpError({ statusCode: 405, message: "Method not allowed" });
  }

  try {
    const webhookData = webhookSchema.parse(req.body);

    // Find the payment in our database
    const payment = await prisma.payment.findFirst({
      where: {
        externalId: webhookData.payment_id,
      },
      include: {
        booking: true,
      },
    });

    if (!payment) {
      console.error(`Payment not found for LawPay payment ID: ${webhookData.payment_id}`);
      return res.status(404).json({ message: "Payment not found" });
    }

    // Update payment status based on webhook event
    switch (webhookData.status) {
      case "succeeded":
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            success: true,
          },
        });
        
        // Update booking status to accepted
        if (payment.booking) {
          await prisma.booking.update({
            where: { id: payment.booking.id },
            data: {
              status: "ACCEPTED",
              paid: true,
            },
          });
        }
        break;

      case "failed":
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            success: false,
          },
        });
        break;

      case "refunded":
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            refunded: true,
          },
        });
        break;

      default:
        console.log(`Unhandled webhook status: ${webhookData.status}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("LawPay webhook error:", error);
    throw new HttpError({ statusCode: 400, message: "Invalid webhook data" });
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(handler) }),
});
