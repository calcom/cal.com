import { SendGrid } from "@trigger.dev/sendgrid";

const apiKey = process.env.SENDGRID_API_KEY;

if (!apiKey) {
  throw new Error("SENDGRID_API_KEY is not set");
}

export const sendgrid = new SendGrid({
  id: "sendgrid",
  apiKey,
});
