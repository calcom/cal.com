import { Inngest } from "inngest";
import { serve } from "inngest/next";

import { appRevokedHandler, paymentLinkPaidHandler } from "@calcom/app-store/razorpay/lib/webhookHandlers";
import { syncTemplates } from "@calcom/app-store/whatsapp-business/trpc/syncTemplates.handler";
import { INNGEST_ID } from "@calcom/lib/constants";
import bookingPaymentReminderHandler from "@calcom/lib/payment/bookingPaymentReminder";
import { handleBookingExportEvent } from "@calcom/trpc/server/routers/viewer/bookings/export.handler";
import { handleCalendlyImportEvent } from "@calcom/web/pages/api/import/calendly";

import { whatsappReminderScheduled, cancelWhatsappReminder } from "./whatsapp-reminder-scheduled";

export const inngestClient = new Inngest({
  id: INNGEST_ID,
  eventKey: process.env.INNGEST_EVENT_KEY || "",
});

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
  { id: `import-from-calendly-${key}`, retries: 2 },
  { event: `import-from-calendly-${key}` },
  async ({ event, step, logger }) => {
    await handleCalendlyImportEvent(
      event.data.sendCampaignEmails,
      event.data.userCalendlyIntegrationProvider,
      event.data.user,
      step,
      logger
    );
    return { message: `Import completed for userID :${event.data.user.id}` };
  }
);

const handleBookingExportFn = inngestClient.createFunction(
  { id: `core-export-bookings-${key}`, retries: 2 },
  { event: `core/export-bookings-${key}` },
  async ({ event, step, logger }) => {
    await handleBookingExportEvent({
      user: event.data.user,
      filters: event.data.filters,
      step,
      logger,
    });
    return { message: `Export Booking mail sent for userID :${event.data.user.id}` };
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
      {
        event: "booking/cancelled",
        match: "data.bookingUid",
      },
    ],
  },
  {
    event: `whatsapp/reminder.scheduled-${key}`,
  },
  whatsappReminderScheduled
);

const handleCancelWhatsappReminder = inngestClient.createFunction(
  {
    id: `whatsapp-reminder-cancelled-${key}`,
    name: "Cancel WhatsApp Reminder",
  },
  {
    event: `whatsapp/reminder.cancelled-${key}`,
  },
  cancelWhatsappReminder
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

export default serve({
  client: inngestClient,
  functions: [
    handleCalendlyImportFn,
    handleBookingExportFn,
    handleWhatsAppTemplateSyncFn,
    handleWhatsappReminderScheduled,
    handleCancelWhatsappReminder,
    handleRazorpayPaymentLinkPaid,
    handleRazorpayAppRevoked,
    triggerBookingPaymentReminder,
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY || "",
});
