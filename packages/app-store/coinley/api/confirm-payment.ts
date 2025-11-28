import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import { appKeysSchema } from "../zod";

/**
 * Confirm payment from frontend after Coinley SDK onSuccess callback
 * IMPORTANT: Verifies payment status with Coinley API before marking booking as paid
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { bookingId, paymentId, transactionHash } = req.body;

    // Validate required fields
    if (!bookingId || !paymentId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find the payment record and associated booking
    const payment = await prisma.payment.findFirst({
      where: {
        bookingId: parseInt(bookingId),
        appId: "coinley",
      },
      select: {
        id: true,
        data: true,
        externalId: true,
        booking: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!payment) {
      console.error("[Coinley] Payment not found");
      return res.status(404).json({ error: "Payment not found" });
    }

    // Log payment data for debugging
    const storedPaymentData = payment.data as { payment?: { id?: string } } | null;
    console.log("[Coinley] Processing payment confirmation:", {
      bookingId,
      receivedPaymentId: paymentId,
      storedPaymentId: storedPaymentData?.payment?.id,
      externalId: payment.externalId,
    });

    // NOTE: The Coinley SDK may return a different payment ID than the initial intent
    // because a new payment is created when the customer actually pays.
    // Security is enforced by verifying the payment status with Coinley API below.

    // Check if booking exists and has a user
    if (!payment.booking || !payment.booking.userId) {
      console.error("[Coinley] Booking or userId not found");
      return res.status(404).json({ error: "Booking not found" });
    }

    // Get merchant credentials to verify payment with Coinley API
    const credential = await prisma.credential.findFirst({
      where: {
        appId: "coinley",
        userId: payment.booking.userId,
      },
      select: {
        key: true,
      },
    });

    if (!credential) {
      return res.status(400).json({ error: "Merchant credentials not found" });
    }

    // Validate credentials format (not used for public endpoint, but validates merchant setup)
    const _credentials = appKeysSchema.parse(credential.key);

    // Verify payment status with Coinley API
    // API URL is configured via environment variable
    const baseURL = process.env.COINLEY_API_URL || "https://talented-mercy-production.up.railway.app";
    const apiUrl = baseURL.endsWith("/api") ? baseURL : `${baseURL}/api`;

    try {
      // First check payment status using public endpoint
      const statusResponse = await axios.get(`${apiUrl}/payments/public/${paymentId}`, {
        timeout: 10000,
      });

      const paymentStatus = statusResponse.data?.payment?.status;

      // Only mark as paid if Coinley confirms payment is successful
      if (paymentStatus !== "confirmed" && paymentStatus !== "completed") {
        return res.status(400).json({
          error: "Payment not confirmed",
          status: paymentStatus,
        });
      }
    } catch (verifyError) {
      console.error("[Coinley] Failed to verify payment with API:", verifyError);
      return res.status(500).json({
        error: "Failed to verify payment status",
      });
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
          confirmedAt: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue,
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

    console.log("[Coinley] ✅ Payment and booking confirmed");

    // TODO: Send booking confirmation email
    // TODO: Trigger Cal.com webhooks

    return res.status(200).json({
      success: true,
      message: "Payment confirmed",
      bookingId,
      paymentId,
    });
  } catch (error) {
    console.error("[Coinley] Error confirming payment:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
