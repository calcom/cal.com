import { createInngestWorkflowContext, getInngestClient } from "@calid/job-dispatcher/";
import { calendlyImportService, bookingExportService } from "@calid/job-engine";
import type { BookingExportJobData, CalendlyImportJobData } from "@calid/job-engine";
import { serve } from "inngest/next";

import { appRevokedHandler, paymentLinkPaidHandler } from "@calcom/app-store/razorpay/lib/webhookHandlers";
import { syncTemplates } from "@calcom/app-store/whatsapp-business/trpc/syncTemplates.handler";
import sendBookingEmailsHandler from "@calcom/features/bookings/lib/handleNewBooking/sendBookingEmails.inngest";
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

const handleWhatsAppTemplateSyncFn = inngestClient.createFunction(
  { id: `whatsapp-template-sync-${key}`, retries: 2 },
  { cron: WHATSAPP_TEMPLATE_SYNC_CRON },
  async ({ step, logger }) => {
    await syncTemplates({ step, logger });
    return { message: `WhatsApp template sync completed` };
  }
);

const handleCalendlyImportFn = inngestClient.createFunction(
  { id: `sync-import-from-calendly-${key}`, retries: 2 },
  { event: `sync/import-from-calendly-${key}` },
  async ({ event, step, logger }) => {
    const ctx = createInngestWorkflowContext(step, logger);
    await calendlyImportService(ctx, event.data as CalendlyImportJobData);
    return { message: `Import completed for userID: ${event.data.user.id}` };
  }
);

// const handleBookingExportFn = inngestClient.createFunction(
//   { id: `core-export-bookings-${key}`, retries: 2 },
//   { event: `core/export-bookings-${key}` },
//   async ({ event, step, logger }) => {
//     await handleBookingExportEvent({
//       user: event.data.user,
//       filters: event.data.filters,
//       step,
//       logger,
//     });
//     return { message: `Export Booking mail sent for userID :${event.data.user.id}` };
//   }
// );

export const handleBookingExportFn = inngestClient.createFunction(
  { id: `core-export-bookings-${key}`, retries: 2 },
  { event: `core/export-bookings-${key}` },
  async ({ event, step, logger }) => {
    const ctx = createInngestWorkflowContext(step, logger);
    await bookingExportService(ctx, event.data as BookingExportJobData);
    return { message: `Export Booking mail sent for userID: ${event.data.user.id}` };
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

const handleRazorpayAppRevoked = inngestClient.createFunction(
  {
    id: `razorpay-app-revoked-${key}`,
    name: "Handle Razorpay App Revoked",
    retries: 3,
  },
  { event: `razorpay/app.revoked-${key}` },
  appRevokedHandler
);

// Inngest function for handling PAYMENT_LINK_PAID event
const handleRazorpayPaymentLinkPaid = inngestClient.createFunction(
  {
    id: `razorpay-payment-link-paid-${key}`,
    name: "Handle Razorpay Payment Link Paid",
    retries: 3,
  },
  { event: `razorpay/payment-link.paid-${key}` },
  paymentLinkPaidHandler
);

export const triggerBookingPaymentReminder = inngestClient.createFunction(
  {
    id: `booking-payment-reminder-${key}`,
    name: "Send Booking payment reminder",
  },
  { event: `booking/payment-reminder-${key}` },
  bookingPaymentReminderHandler
);

const handleBookingEmailsScheduled = inngestClient.createFunction(
  {
    id: `booking-emails-scheduled-${key}`,
    name: "Send Booking Scheduled Emails",
    retries: 3,
  },
  { event: `booking/emails.scheduled-${key}` },
  sendBookingEmailsHandler
);

const handleBookingEmailsRequest = inngestClient.createFunction(
  {
    id: `booking-emails-request-${key}`,
    name: "Send Booking Request Emails",
    retries: 3,
  },
  { event: `booking/emails.request-${key}` },
  sendBookingEmailsHandler
);

const handleBookingEmailsRescheduled = inngestClient.createFunction(
  {
    id: `booking-emails-rescheduled-${key}`,
    name: "Send Booking Rescheduled Emails",
    retries: 3,
  },
  { event: `booking/emails.rescheduled-${key}` },
  sendBookingEmailsHandler
);

const handleBookingEmailsCancelled = inngestClient.createFunction(
  {
    id: `booking-emails-cancelled-${key}`,
    name: "Send Booking Cancelled Emails",
    retries: 3,
  },
  { event: `booking/emails.cancelled-${key}` },
  sendBookingEmailsHandler
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
