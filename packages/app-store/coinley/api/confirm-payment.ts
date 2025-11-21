import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

import prisma from "@calcom/prisma";
import type { Prisma } from "@prisma/client";

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

    // Get merchant credentials to verify payment with Coinley API
    const credential = await prisma.credential.findFirst({
      where: {
        appId: "coinley",
        userId: payment.booking.userId!,
      },
      select: {
        key: true,
      },
    });

    if (!credential) {
      return res.status(400).json({ error: "Merchant credentials not found" });
    }

    const credentials = appKeysSchema.parse(credential.key);

    // Verify payment status with Coinley API
    const apiUrl = credentials.api_url.endsWith("/api")
      ? credentials.api_url
      : `${credentials.api_url}/api`;

    try {
      const verifyResponse = await axios.get(`${apiUrl}/payments/${paymentId}`, {
        headers: {
          "X-API-Key": credentials.api_key,
          "X-API-Secret": credentials.api_secret,
        },
        timeout: 10000,
      });

      const paymentStatus = verifyResponse.data;

      // Only mark as paid if Coinley confirms payment is successful
      if (paymentStatus.status !== "confirmed" && paymentStatus.status !== "completed") {
        return res.status(400).json({
          error: "Payment not confirmed",
          status: paymentStatus.status,
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

    console.log("[Coinley] ✅ Payment and booking confirmed");

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
