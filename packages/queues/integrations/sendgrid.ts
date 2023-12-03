import { SendGrid } from "@trigger.dev/sendgrid";

const apiKey = process.env.SENDGRID_API_KEY;

/**
 * SendGrid integration for Trigger.dev
 *
 * If it's not configured, it will be undefined.
 */
export const sendgrid = apiKey
  ? new SendGrid({
      id: "sendgrid",
      apiKey,
    })
  : undefined;
