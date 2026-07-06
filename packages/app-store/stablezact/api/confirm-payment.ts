import process from "node:process";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";
import { appKeysSchema } from "../zod";

/**
 * Confirm payment from frontend after Stablezact SDK onSuccess callback
 * IMPORTANT: Verifies payment status with Stablezact API before marking booking as paid
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
        bookingId: parseInt(bookingId, 10),
        appId: "stablezact",
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
      return res.status(404).json({ error: "Payment not found" });
    }

    // Check if booking exists and has a user
    if (!payment.booking || !payment.booking.userId) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Get merchant credentials to verify payment with Stablezact API
    const credential = await prisma.credential.findFirst({
      where: {
        appId: "stablezact",
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

    // Verify payment status with Stablezact API
    // API URL is configured via environment variable
    const baseURL = process.env.STABLEZACT_API_URL || "https://hub.stablezact.com";
    const apiUrl = baseURL.endsWith("/api") ? baseURL : `${baseURL}/api`;

    try {
      // Verify payment status using public endpoint
      const statusResponse = await axios.get(`${apiUrl}/payments/public/${paymentId}`, {
        timeout: 10000,
      });

      const paymentData = statusResponse.data?.payment;
      const paymentStatus = paymentData?.status;

      // Only mark as paid once Stablezact confirms the payment succeeded. "swept" means
      // the funds were received and already swept to the merchant wallet — also a success.
      const successStatuses = ["confirmed", "completed", "swept"];
      if (!successStatuses.includes(paymentStatus)) {
        return res.status(400).json({
          error: "Payment not confirmed",
          status: paymentStatus,
        });
      }

      // OWNERSHIP CHECK: the payment's metadata.bookingId (set by our PaymentService at
      // creation and returned by the public status endpoint) must match this booking.
      // Require it and compare unconditionally — a missing bookingId is rejected, not
      // skipped, so a confirmed paymentId from another context cannot confirm this booking.
      const metadataBookingId = paymentData?.metadata?.bookingId?.toString();
      if (!metadataBookingId || metadataBookingId !== bookingId.toString()) {
        return res.status(403).json({ error: "Payment does not belong to this booking" });
      }

      // Defense in depth: the confirmed amount must also equal what this booking's payment
      // was created for. Lenient when the stored amount is unavailable so it never rejects
      // an otherwise-valid, ownership-verified payment.
      const storedData = (payment.data ?? {}) as Record<string, unknown>;
      const expectedAmount = Number(storedData.amount);
      const actualAmount = Number(paymentData?.amount);
      if (
        Number.isFinite(expectedAmount) &&
        Number.isFinite(actualAmount) &&
        Math.abs(expectedAmount - actualAmount) > 1e-9
      ) {
        return res.status(403).json({ error: "Payment amount does not match this booking" });
      }
    } catch {
      return res.status(500).json({
        error: "Failed to verify payment status",
      });
    }

    // Single-use guard: a given Stablezact paymentId may confirm only one booking.
    // This prevents a confirmed paymentId from being replayed against another booking.
    const alreadyUsed = await prisma.payment.findFirst({
      where: {
        externalId: paymentId,
        success: true,
        NOT: { id: payment.id },
      },
      select: { id: true },
    });

    if (alreadyUsed) {
      return res.status(409).json({ error: "This payment has already been used to confirm a booking" });
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
      where: { id: parseInt(bookingId, 10) },
      data: {
        paid: true,
        status: "ACCEPTED",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Payment confirmed",
    });
  } catch {
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
