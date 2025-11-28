import { z } from "zod";

import { sendCustomWorkflowEmail } from "@calcom/emails/workflow-email-service";

export const ZSendWorkflowEmailsSchemaEager = z.object({
  to: z.array(z.string()),
  subject: z.string(),
  html: z.string(),
  replyTo: z.string().optional(),
  sender: z.string().nullable().optional(),
  attachments: z
    .array(
      z
        .object({
          content: z.string(),
          filename: z.string(),
        })
        .passthrough()
    )
    .optional(),
});

const ZSendWorkflowEmailsSchemaLazy = z.object({
  bookingUid: z.string(),
  workflowReminderId: z.number(),
});

export const ZSendWorkflowEmailsSchema = z.union([
  ZSendWorkflowEmailsSchemaEager,
  ZSendWorkflowEmailsSchemaLazy,
]);

export async function sendWorkflowEmails(payload: string): Promise<void> {
  const mailData = ZSendWorkflowEmailsSchema.parse(JSON.parse(payload));

  await Promise.all(
    mailData.to.map((to) =>
      sendCustomWorkflowEmail({
        ...mailData,
        to,
      })
    )
  );
}
