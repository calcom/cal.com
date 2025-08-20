import { Inngest } from "inngest";
import { serve } from "inngest/next";

import { INNGEST_ID } from "@calcom/lib/constants";
import { handleBookingExportEvent } from "@calcom/trpc/server/routers/viewer/bookings/export.handler";
import { handleCalendlyImportEvent } from "@calcom/web/pages/api/import/calendly";

export const inngestClient = new Inngest({
  id: INNGEST_ID,
  eventKey: process.env.INNGEST_EVENT_KEY || "",
});

const key = INNGEST_ID === "onehash-cal" ? "prod" : "stag";

export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};

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
  { id: `export-bookings-${key}`, retries: 2 },
  { event: `export-bookings-${key}` },
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

// Create an API that serves zero functions
export default serve({
  client: inngestClient,
  functions: [handleCalendlyImportFn, handleBookingExportFn],
  signingKey: process.env.INNGEST_SIGNING_KEY || "",
});
