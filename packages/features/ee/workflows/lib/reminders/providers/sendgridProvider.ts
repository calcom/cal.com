/**
 * @deprecated use smtp with tasker instead
 */

import process from "node:process";
import { addHTMLStyles } from "@calcom/emails/templates/workflow-email";
import { SENDER_NAME } from "@calcom/lib/constants";
import { setTestEmail } from "@calcom/lib/testEmails";
import client from "@sendgrid/client";
import type { MailData } from "@sendgrid/helpers/classes/mail";
import sgMail from "@sendgrid/mail";
import { v4 as uuidv4 } from "uuid";

const testMode = process.env.NEXT_PUBLIC_IS_E2E || process.env.INTEGRATION_TEST_MODE;

function assertSendgrid() {
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_EMAIL) {
    const sendgridAPIKey = process.env.SENDGRID_API_KEY as string;
    sgMail.setApiKey(sendgridAPIKey);
    client.setApiKey(sendgridAPIKey);
  } else {
    console.error("Sendgrid credentials are missing from the .env file");
  }
}

export async function getBatchId() {
  if (testMode) {
    return uuidv4();
  }
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
  mailData: Partial<MailData> & { sender?: string | null; includeCalendarEvent?: boolean }
) {
  assertSendgrid();

  if (testMode) {
    if (!mailData.sendAt) {
      setTestEmail({
        to: mailData.to?.toString() || "",
        from: {
          email: process.env.SENDGRID_EMAIL as string,
          name: mailData.sender || SENDER_NAME,
        },
        subject: mailData.subject || "",
        html: mailData.html || "",
      });
    }
    console.log(
      "Skipped Sending Email as process.env.NEXT_PUBLIC_IS_E2E or process.env.INTEGRATION_TEST_MODE is set. Emails are available in globalThis.testEmails"
    );

    return new Promise((r) => r("Skipped sendEmail for Unit Tests"));
  }

  if (!process.env.SENDGRID_API_KEY) {
    console.info("No sendgrid API key provided, skipping email");
    return Promise.resolve();
  }

  return sgMail.send({
    to: mailData.to,
    from: {
      email: process.env.SENDGRID_EMAIL as string,
      name: mailData.sender || SENDER_NAME,
    },
    subject: mailData.subject,
    html: addHTMLStyles(mailData.html),
    batchId: mailData.batchId,
    replyTo: mailData.replyTo || (process.env.SENDGRID_EMAIL as string),
    attachments: mailData.attachments,
    sendAt: mailData.sendAt,
  });
}

export function cancelScheduledEmail(referenceId: string | null) {
  if (!referenceId) {
    console.info("No referenceId provided, skip canceling email");
    return Promise.resolve();
  }

  assertSendgrid();

  return client.request({
    url: "/v3/user/scheduled_sends",
    method: "POST",
    body: {
      batch_id: referenceId,
      status: "cancel",
    },
  });
}

export function deleteScheduledSend(referenceId: string | null) {
  if (!referenceId) {
    console.info("No referenceId provided, skip deleting scheduledSend");
    return Promise.resolve();
  }

  assertSendgrid();

  return client.request({
    url: `/v3/user/scheduled_sends/${referenceId}`,
    method: "DELETE",
  });
}
