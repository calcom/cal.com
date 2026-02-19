import { createInngestWorkflowContext, getInngestClient, JobName } from "@calid/job-dispatcher";
import {
  calendlyImportService,
  bookingExportService,
  razorpayAppRevokedService,
  razorpayPaymentLinkPaidService,
  bookingPaymentReminderService,
  bookingEmailsService,
  WebhookNotFoundError,
  WebhookRejectedError,
  WebhookTriggerError,
  triggerScheduledWebhookService,
  BookingNotFoundError,
  PaymentAppNotFoundError,
  PaymentReminderError,
} from "@calid/job-engine";
import type {
  BookingEmailsJobData,
  BookingExportJobData,
  BookingPaymentReminderData,
  CalendlyImportJobData,
  RazorpayAppRevokedJobData,
  RazorpayPaymentLinkPaidJobData,
  TriggerScheduledWebhookData,
} from "@calid/job-engine";
import { NonRetriableError } from "inngest";
import { serve } from "inngest/next";

import { syncTemplates } from "@calcom/app-store/whatsapp-business/trpc/syncTemplates.handler";
import { INNGEST_ID } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import { whatsappReminderScheduled } from "./whatsapp-reminder-scheduled";

export const inngestClient = getInngestClient();

const key = INNGEST_ID === "onehash-cal" ? "prod" : "stag";
const WHATSAPP_TEMPLATE_SYNC_CRON = process.env.WHATSAPP_TEMPLATE_SYNC_CRON ?? "0 * * * *";

export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};

const handleCalendlyImportFn = inngestClient.createFunction(
  { id: `sync-import-from-calendly-${key}`, retries: 2 },
  { event: `${JobName.CALENDLY_IMPORT}-${key}` },
  async ({ event, step, logger }) => {
    const ctx = createInngestWorkflowContext(step, logger);
    await calendlyImportService(ctx, event.data as CalendlyImportJobData);
    return { message: `Import completed for userID: ${event.data.user.id}` };
  }
);

export const handleBookingExportFn = inngestClient.createFunction(
  { id: `core-export-bookings-${key}`, retries: 2 },
  { event: `${JobName.BOOKING_EXPORT}-${key}` },
  async ({ event, step, logger }) => {
    const ctx = createInngestWorkflowContext(step, logger);
    await bookingExportService(ctx, event.data as BookingExportJobData);
    return { message: `Export Booking mail sent for userID: ${event.data.user.id}` };
  }
);

export const handleRazorpayAppRevoked = inngestClient.createFunction(
  {
    id: `razorpay-app-revoked-${key}`,
    name: "Handle Razorpay App Revoked",
    retries: 3,
  },
  { event: `${JobName.RAZORPAY_APP_REVOKED_WEBHOOK}-${key}` },
  async ({ event, step, logger }) => {
    const ctx = createInngestWorkflowContext(step, logger);
    const result = await razorpayAppRevokedService(ctx, event.data as RazorpayAppRevokedJobData);
    return result;
  }
);

export const handleRazorpayPaymentLinkPaid = inngestClient.createFunction(
  {
    id: `razorpay-payment-link-paid-${key}`,
    name: "Handle Razorpay Payment Link Paid",
    retries: 3,
  },
  { event: `${JobName.RAZORPAY_PAYMENT_LINK_PAID_WEBHOOK}-${key}` },
  async ({ event, step, logger }) => {
    const ctx = createInngestWorkflowContext(step, logger);
    const result = await razorpayPaymentLinkPaidService(ctx, event.data as RazorpayPaymentLinkPaidJobData);
    return result;
  }
);

export const handleBookingEmailsScheduled = inngestClient.createFunction(
  {
    id: `booking-emails-scheduled-${key}`,
    name: "Send Booking Scheduled Emails",
    retries: 3,
  },
  { event: `${JobName.BOOKING_EMAILS_SCHEDULED}-${key}` },
  async ({ event, step, logger }) => {
    const ctx = createInngestWorkflowContext(step, logger);
    return await bookingEmailsService(ctx, event.data as BookingEmailsJobData);
  }
);

export const handleBookingEmailsRequest = inngestClient.createFunction(
  {
    id: `booking-emails-request-${key}`,
    name: "Send Booking Request Emails",
    retries: 3,
  },
  { event: `${JobName.BOOKING_EMAILS_REQUEST}-${key}` },
  async ({ event, step, logger }) => {
    const ctx = createInngestWorkflowContext(step, logger);
    return await bookingEmailsService(ctx, event.data as BookingEmailsJobData);
  }
);

export const handleBookingEmailsRescheduled = inngestClient.createFunction(
  {
    id: `booking-emails-rescheduled-${key}`,
    name: "Send Booking Rescheduled Emails",
    retries: 3,
  },
  { event: `${JobName.BOOKING_EMAILS_RESCHEDULED}-${key}` },
  async ({ event, step, logger }) => {
    const ctx = createInngestWorkflowContext(step, logger);
    return await bookingEmailsService(ctx, event.data as BookingEmailsJobData);
  }
);

export const handleBookingEmailsCancelled = inngestClient.createFunction(
  {
    id: `booking-emails-cancelled-${key}`,
    name: "Send Booking Cancelled Emails",
    retries: 3,
  },
  { event: `${JobName.BOOKING_EMAILS_CANCELLED}-${key}` },
  async ({ event, step, logger }) => {
    const ctx = createInngestWorkflowContext(step, logger);
    return await bookingEmailsService(ctx, event.data as BookingEmailsJobData);
  }
);

export const handleScheduledWebhookTrigger = inngestClient.createFunction(
  {
    id: `webhook-schedule-trigger-${key}`,
    name: "Trigger scheduled webhook",
    retries: 1,
  },
  {
    event: `${JobName.WEBHOOK_SCHEDULED_TRIGGER}-${key}`,
  },
  async ({ event, step, logger }) => {
    const data = event.data as TriggerScheduledWebhookData;

    // Create workflow context from Inngest step + logger
    const ctx = createInngestWorkflowContext(step, logger);

    try {
      const result = await triggerScheduledWebhookService(data, prisma, ctx);
      return result;
    } catch (error) {
      // ── Permanent failures ────────────────────────────────────────────
      if (error instanceof WebhookNotFoundError || error instanceof WebhookRejectedError) {
        throw new NonRetriableError(error.message);
      }

      // ── Transient failures ────────────────────────────────────────────
      if (error instanceof WebhookTriggerError) {
        throw error;
      }

      // ── Unexpected errors ─────────────────────────────────────────────
      throw new NonRetriableError(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);

export const triggerBookingPaymentReminder = inngestClient.createFunction(
  {
    id: `booking-payment-reminder-${key}`,
    name: "Send Booking payment reminder",
  },
  {
    event: `${JobName.BOOKING_PAYMENT_REMINDER}-${key}`,
  },
  async ({ event, step, logger }) => {
    const data = event.data as BookingPaymentReminderData;

    // Create workflow context from Inngest step + logger
    const workflow = createInngestWorkflowContext(step, logger);

    try {
      const result = await bookingPaymentReminderService(data, prisma, workflow);
      return result;
    } catch (error) {
      // ── Permanent failures ────────────────────────────────────────────
      if (error instanceof BookingNotFoundError || error instanceof PaymentAppNotFoundError) {
        throw new NonRetriableError(error.message);
      }

      // ── Transient failures ────────────────────────────────────────────
      if (error instanceof PaymentReminderError) {
        throw error;
      }

      // ── Unexpected errors ─────────────────────────────────────────────
      throw error;
    }
  }
);

const handleWhatsAppTemplateSyncFn = inngestClient.createFunction(
  { id: `whatsapp-template-sync-${key}`, retries: 2 },
  { cron: WHATSAPP_TEMPLATE_SYNC_CRON },
  async ({ step, logger }) => {
    await syncTemplates({ step, logger });
    return { message: `WhatsApp template sync completed` };
  }
);

const handleWhatsappReminderScheduled = inngestClient.createFunction(
  {
    id: `whatsapp-reminder-scheduled-${key}`,
    name: "Send Scheduled WhatsApp Reminder",
    retries: 1,
    cancelOn: [
      {
        event: `whatsapp/reminder.cancelled-${key}`,
        match: "data.reminderId",
      },
    ],
  },
  {
    event: `whatsapp/reminder.scheduled-${key}`,
  },
  whatsappReminderScheduled
);

export default serve({
  client: inngestClient,
  functions: [
    handleCalendlyImportFn,
    handleBookingExportFn,
    handleWhatsAppTemplateSyncFn,
    handleWhatsappReminderScheduled,
    handleRazorpayPaymentLinkPaid,
    handleRazorpayAppRevoked,
    triggerBookingPaymentReminder,
    handleBookingEmailsScheduled,
    handleBookingEmailsRequest,
    handleBookingEmailsRescheduled,
    handleBookingEmailsCancelled,
    handleScheduledWebhookTrigger,
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY || "",
});
