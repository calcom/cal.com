import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@calcom/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Confirm payment directly from frontend (like WooCommerce AJAX approach)
 * Called when the Coinley SDK onSuccess callback is triggered
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { bookingId, bookingUid, paymentId, transactionHash, paymentDetails } = req.body;

    console.log("[Coinley] Direct payment confirmation request:", {
      bookingId,
      bookingUid,
      paymentId,
      transactionHash,
    });

    // Validate required fields
    if (!bookingId || !paymentId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find the payment record
    const payment = await prisma.payment.findFirst({
      where: {
        bookingId: parseInt(bookingId),
        appId: "coinley",
      },
    });

    if (!payment) {
      console.error("[Coinley] Payment not found for booking:", bookingId);
      return res.status(404).json({ error: "Payment not found" });
    }

    // Update payment record
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        success: true,
        externalId: paymentId,
        data: {
          ...(payment.data as object),
          transactionHash,
          status: "confirmed",
          paymentDetails,
          confirmedAt: new Date().toISOString(),
        } as unknown as Prisma.InputJsonObject,
      },
    });

    // Mark booking as paid
    await prisma.booking.update({
      where: { id: parseInt(bookingId) },
      data: {
        paid: true,
        status: "ACCEPTED",
      },
    });

    console.log("[Coinley] ✅ Payment and booking confirmed:", {
      paymentId,
      bookingId,
      transactionHash,
    });

    // TODO: Send booking confirmation email
    // TODO: Trigger Cal.com webhooks

    return res.status(200).json({
      success: true,
      message: "Payment confirmed",
      bookingId,
      paymentId,
    });
  } catch (error: any) {
    console.error("[Coinley] Error confirming payment:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}
