import { z } from "zod";

import { sendCustomWorkflowEmail } from "@calcom/emails";

export const ZSendWorkflowEmailSchema = z.object({
  to: z.string(),
  subject: z.string(),
  html: z.string(),
  replyTo: z.string(),
  sender: z.string(),
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

export async function sendWorkflowEmail(payload: string): Promise<void> {
  const mailData = ZSendWorkflowEmailSchema.parse(JSON.parse(payload));
  await sendCustomWorkflowEmail(mailData);
}
