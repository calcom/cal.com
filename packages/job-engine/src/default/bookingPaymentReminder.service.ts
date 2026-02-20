import type { WorkflowContext } from "@calid/job-dispatcher";

import appStore from "@calcom/app-store";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { PrismaClient } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { IAbstractPaymentService, PaymentApp } from "@calcom/types/PaymentService";

import type { BookingPaymentReminderData } from "..";

const log = logger.getSubLogger({ prefix: ["[booking-payment-reminder]"] });

// ─────────────────────────────────────────────────────────────────────────
// Error hierarchy
// ─────────────────────────────────────────────────────────────────────────

export class PaymentReminderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "PaymentReminderError";
  }
}

export class BookingNotFoundError extends Error {
  constructor(public readonly bookingId: number) {
    super(`Booking ${bookingId} not found`);
    this.name = "BookingNotFoundError";
  }
}

export class PaymentAppNotFoundError extends Error {
  constructor(public readonly appKey: string) {
    super(`Payment app not found: ${appKey}`);
    this.name = "PaymentAppNotFoundError";
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface BookingPaymentReminderResult {
  success: boolean;
  bookingId: number;
  paymentCompleted: boolean;
  reminderSent: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// Type guards
// ─────────────────────────────────────────────────────────────────────────

const isPaymentApp = (x: unknown): x is PaymentApp =>
  !!x &&
  typeof x === "object" &&
  "lib" in x &&
  typeof x.lib === "object" &&
  !!x.lib &&
  "PaymentService" in x.lib;

const isKeyOf = <T extends object>(obj: T, key: unknown): key is keyof T =>
  typeof key === "string" && key in obj;

// ─────────────────────────────────────────────────────────────────────────
// Service implementation
// ─────────────────────────────────────────────────────────────────────────

export async function bookingPaymentReminderService(
  data: BookingPaymentReminderData,
  prisma: PrismaClient,
  ctx: WorkflowContext
): Promise<BookingPaymentReminderResult> {
  const { evt, booking, paymentData, eventTypeMetadata, bookingSeatId, paymentAppCredentials } = data;

  ctx.log(`Processing payment reminder for booking ${booking.id}`, "info");

  // ── Step 1: Check if payment is completed ────────────────────────────────
  const shouldSendReminder = await ctx.run("should-send-payment-reminder", async () => {
    const bookingData = await prisma.booking.findFirst({
      where: { id: booking.id },
      select: {
        status: true,
        payment: {
          where: bookingSeatId ? { bookingSeatId } : {},
          select: { success: true },
        },
      },
    });

    if (!bookingData) {
      ctx.log(`Booking ${booking.id} not found`, "warn");
      return { shouldSend: false, reason: "booking_not_found" };
    }

    const isPending = bookingData.status === BookingStatus.PENDING;
    const hasSuccessfulPayment = bookingData.payment.some((p) => p.success === true);

    ctx.log(`Booking ${booking.id} status check: pending=${isPending}, paid=${hasSuccessfulPayment}`, "info");

    if (!isPending) {
      return { shouldSend: false, reason: "booking_not_pending" };
    }

    if (hasSuccessfulPayment) {
      return { shouldSend: false, reason: "payment_already_completed" };
    }

    return { shouldSend: true, reason: "payment_pending" };
  });

  if (!shouldSendReminder.shouldSend) {
    ctx.log(`Payment reminder skipped for booking ${booking.id}: ${shouldSendReminder.reason}`, "info");

    return {
      success: true,
      bookingId: booking.id,
      paymentCompleted: shouldSendReminder.reason === "payment_already_completed",
      reminderSent: false,
    };
  }

  // ── Step 2: Reconstruct event with translations ──────────────────────────
  const reconstructedEvt = await ctx.run("reconstruct-event", async () => {
    ctx.log("Reconstructing event with translation functions", "info");

    const organizerTranslate = await getTranslation(evt.organizer.language.locale ?? "en", "common");

    const attendeesWithTranslations = await Promise.all(
      evt.attendees.map(async (attendee) => ({
        ...attendee,
        language: {
          locale: attendee.language.locale,
          translate: await getTranslation(attendee.language.locale ?? "en", "common"),
        },
      }))
    );

    return {
      ...evt,
      organizer: {
        ...evt.organizer,
        language: {
          locale: evt.organizer.language.locale,
          translate: organizerTranslate,
        },
      },
      attendees: attendeesWithTranslations,
    };
  });

  // ── Step 3: Get payment app instance ─────────────────────────────────────
  const paymentInstance = await ctx.run("get-payment-app-instance", async () => {
    const appKey = paymentAppCredentials.appDirName;

    if (!appKey || !isKeyOf(appStore, appKey)) {
      throw new PaymentAppNotFoundError(appKey ?? "undefined");
    }

    const paymentApp = await appStore[appKey]?.();

    if (!isPaymentApp(paymentApp)) {
      throw new PaymentAppNotFoundError(appKey);
    }

    const PaymentService = paymentApp.lib.PaymentService;
    return new PaymentService(paymentAppCredentials) as IAbstractPaymentService;
  });

  // ── Step 4: Trigger afterPayment (send reminder) ─────────────────────────
  await ctx.run("send-payment-reminder", async () => {
    ctx.log(`Sending payment reminder for booking ${booking.id}`, "info");

    await paymentInstance.afterPayment(
      reconstructedEvt,
      booking,
      paymentData,
      eventTypeMetadata,
      bookingSeatId
    );

    ctx.log(`Payment reminder sent successfully for booking ${booking.id}`, "info");
    return true;
  });

  return {
    success: true,
    bookingId: booking.id,
    paymentCompleted: false,
    reminderSent: true,
  };
}
