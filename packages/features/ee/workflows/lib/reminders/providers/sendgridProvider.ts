import client from "@sendgrid/client";
import type { MailData } from "@sendgrid/helpers/classes/mail";
import sgMail from "@sendgrid/mail";

import { SENDER_NAME } from "@calcom/lib/constants";

let sendgridAPIKey: string;
let senderEmail: string;

function assertSendgrid() {
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_EMAIL) {
    sendgridAPIKey = process.env.SENDGRID_API_KEY as string;
    senderEmail = process.env.SENDGRID_EMAIL as string;
    sgMail.setApiKey(sendgridAPIKey);
    client.setApiKey(sendgridAPIKey);
  }
  console.error("Sendgrid credentials are missing from the .env file");
}

export async function getBatchId() {
  assertSendgrid();
  if (!process.env.SENDGRID_API_KEY) {
    console.info("No sendgrid API key provided, returning DUMMY_BATCH_ID");
    return "DUMMY_BATCH_ID";
  }
  const batchIdResponse = await client.request({
    url: "/v3/mail/batch",
    method: "POST",
  });
  return batchIdResponse[1].batch_id as string;
}

export function sendSendgridMail(
  mailData: Partial<MailData>,
  addData: { sender?: string | null; includeCalendarEvent?: boolean }
) {
  assertSendgrid();
  if (!sendgridAPIKey) {
    console.info("No sendgrid API key provided, skipping email");
    return Promise.resolve();
  }

  const sandboxMode = process.env.NEXT_PUBLIC_IS_E2E || process.env.INTEGRATION_TEST_MODE ? true : false;

  return sgMail.send({
    to: mailData.to,
    from: {
      email: senderEmail,
      name: addData.sender || SENDER_NAME,
    },
    subject: mailData.subject,
    html: mailData.html || "",
    batchId: mailData.batchId,
    replyTo: mailData.replyTo || senderEmail,
    mailSettings: {
      sandboxMode: {
        enable: sandboxMode,
      },
    },
    attachments: mailData.attachments,
    sendAt: mailData.sendAt,
  });
}
