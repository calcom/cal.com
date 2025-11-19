import { z } from "zod";

import { getBooking } from "@calcom/features/bookings/lib/payment/getBooking";
import { createPaymentLink } from "@calcom/app-store/stripepayment/lib/client";
import stripe from "@calcom/features/ee/payments/server/stripe";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import { AttendeeRepository } from "@calcom/features/bookings/repositories/AttendeeRepository";
import { sendAwaitingPaymentEmailAndSMS } from "@calcom/emails/email-manager";

const log = logger.getSubLogger({ prefix: ["sendAwaitingPaymentEmail"] });

export const sendAwaitingPaymentEmailPayloadSchema = z.object({
  bookingId: z.number(),
  paymentId: z.number(),
  attendeeSeatId: z.string().nullable().optional(),
});

export async function sendAwaitingPaymentEmail(payload: string): Promise<void> {
  try {
    const { bookingId, paymentId, attendeeSeatId } = sendAwaitingPaymentEmailPayloadSchema.parse(
      JSON.parse(payload)
    );

    log.debug(`Processing sendAwaitingPaymentEmail task for bookingId ${bookingId}, paymentId ${paymentId}`);

    // Fetch current booking state
    const { booking, evt, eventType } = await getBooking(bookingId);

    // Check payment status in database
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        success: true,
        externalId: true,
        app: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!payment) {
      log.warn(`Payment ${paymentId} not found, skipping email`);
      return;
    }

    // If payment already succeeded or booking is already paid, skip email
    if (payment.success || booking.paid) {
      log.debug(
        `Payment ${paymentId} already succeeded or booking ${bookingId} already paid, skipping email`
      );
      return;
    }

    // Optional: Verify Stripe PaymentIntent status directly for delayed webhook scenarios
    if (payment.externalId && payment.app?.slug === "stripe") {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(payment.externalId);
        if (paymentIntent.status === "succeeded") {
          log.debug(
            `Stripe PaymentIntent ${payment.externalId} already succeeded, skipping email (webhook may be delayed)`
          );
          return;
        }
      } catch (error) {
        // If we can't retrieve the PaymentIntent, log but continue (might be a different payment type)
        log.warn(
          `Could not verify Stripe PaymentIntent status for ${payment.externalId}, continuing with email send`,
          safeStringify(error)
        );
      }
    }

    // Filter attendees if this is for a specific seat
    let attendeesToEmail = evt.attendees;
    if (attendeeSeatId) {
      const attendeeRepository = new AttendeeRepository(prisma);
      const seatAttendees = await attendeeRepository.findByBookingIdAndSeatReference(
        bookingId,
        attendeeSeatId
      );
      const seatEmails = new Set(seatAttendees.map((a) => (a.email || "").toLowerCase()));
      attendeesToEmail = evt.attendees.filter((attendee) =>
        seatEmails.has((attendee.email || "").toLowerCase())
      );

      if (attendeesToEmail.length === 0) {
        log.warn(`No attendees found for seat ${attendeeSeatId} in booking ${bookingId}, skipping email`);
        return;
      }
    }

    // Get payment details needed for the email
    const paymentRecord = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        uid: true,
        paymentOption: true,
        amount: true,
        currency: true,
      },
    });

    if (!paymentRecord) {
      log.warn(`Payment ${paymentId} not found when fetching payment details, skipping email`);
      return;
    }

    // Send the awaiting payment email
    await sendAwaitingPaymentEmailAndSMS(
      {
        ...evt,
        attendees: attendeesToEmail,
        paymentInfo: {
          link: createPaymentLink({
            paymentUid: paymentRecord.uid,
            name: booking.user?.name ?? null,
            email: booking.user?.email ?? null,
            date: booking.startTime.toISOString(),
          }),
          paymentOption: paymentRecord.paymentOption || "ON_BOOKING",
          amount: paymentRecord.amount,
          currency: paymentRecord.currency,
        },
      },
      eventType.metadata
    );

    log.debug(`Successfully sent awaiting payment email for bookingId ${bookingId}`);
  } catch (error) {
    log.error(
      `Failed to send awaiting payment email`,
      safeStringify({ payload, error: error instanceof Error ? error.message : String(error) })
    );
    throw error;
  }
}

