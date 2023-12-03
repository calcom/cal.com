import { eventTrigger } from "@trigger.dev/sdk";
import { z } from "zod";

import { queue } from "../index";
import { sendgrid } from "../integrations/sendgrid";

/** This job sends a basic email to a 'to' email address, a 'subject', a 'text' field and a 'from' email address. */
export const sendEmailJob = queue?.defineJob({
  id: "sendgrid-send-email",
  name: "SendGrid: send email",
  version: "1.0.0",
  trigger: eventTrigger({
    name: "send.email",
    schema: z.object({
      to: z.string().or(z.string().array()).optional(),
      subject: z.string(),
      text: z.string(),
      // The 'from' email address must be a verified domain in your SendGrid account.
      from: z.string(),
      cc: z.string().or(z.string().array()).optional(),
      html: z.string().optional(),
    }),
  }),
  integrations: sendgrid
    ? {
        sendgrid,
      }
    : undefined,
  run: async (payload, io, ctx) => {
    if (!sendgrid) {
      io.logger.info("SendGrid integration not configured");
      return;
    }

    await io.sendgrid.sendEmail("send-email", {
      ...payload,
      from: {
        email: payload.from,
        name: "Cal.ai",
      },
    });
  },
});
