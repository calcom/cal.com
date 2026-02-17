import { createInngestWorkflowContext, getInngestClient } from "@calid/job-dispatcher/";
import {
  calendlyImportService,
  bookingExportService,
  razorpayAppRevokedService,
  razorpayPaymentLinkPaidService,
  bookingEmailsService,
} from "@calid/job-engine";
import type {
  BookingEmailsJobData,
  BookingExportJobData,
  CalendlyImportJobData,
  RazorpayAppRevokedJobData,
  RazorpayPaymentLinkPaidJobData,
} from "@calid/job-engine";
import { serve } from "inngest/next";

import { syncTemplates } from "@calcom/app-store/whatsapp-business/trpc/syncTemplates.handler";
import { INNGEST_ID } from "@calcom/lib/constants";
import bookingPaymentReminderHandler from "@calcom/lib/payment/bookingPaymentReminder";

import { triggerScheduledWebhook } from "./trigger-scheduled-webhook";
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
  { event: `sync/import-from-calendly-${key}` },
  async ({ event, step, logger }) => {
    const ctx = createInngestWorkflowContext(step, logger);
    await calendlyImportService(ctx, event.data as CalendlyImportJobData);
    return { message: `Import completed for userID: ${event.data.user.id}` };
  }
);

export const handleBookingExportFn = inngestClient.createFunction(
  { id: `core-export-bookings-${key}`, retries: 2 },
  { event: `core/export-bookings-${key}` },
  async ({ event, step, logger }) => {
    const ctx = createInngestWorkflowContext(step, logger);
    await bookingExportService(ctx, event.data as BookingExportJobData);
    return { message: `Export Booking mail sent for userID: ${event.data.user.id}` };
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

export const handleRazorpayAppRevoked = inngestClient.createFunction(
  {
    id: `razorpay-app-revoked-${key}`,
    name: "Handle Razorpay App Revoked",
    retries: 3,
  },
  { event: `razorpay/app.revoked-${key}` },
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
  { event: `razorpay/payment-link.paid-${key}` },
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
  { event: `booking/emails.scheduled-${key}` },
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
  { event: `booking/emails.request-${key}` },
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
  { event: `booking/emails.rescheduled-${key}` },
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
  { event: `booking/emails.cancelled-${key}` },
  async ({ event, step, logger }) => {
    const ctx = createInngestWorkflowContext(step, logger);
    return await bookingEmailsService(ctx, event.data as BookingEmailsJobData);
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

const handleScheduledWebhookTrigger = inngestClient.createFunction(
  {
    id: `webhook-schedule-trigger-${key}`,
    name: "Trigger scheduled webhook",
    retries: 1,
  },
  {
    event: `webhook/schedule.trigger-${key}`,
  },
  triggerScheduledWebhook
);

export const triggerBookingPaymentReminder = inngestClient.createFunction(
  {
    id: `booking-payment-reminder-${key}`,
    name: "Send Booking payment reminder",
  },
  { event: `booking/payment-reminder-${key}` },
  bookingPaymentReminderHandler
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
