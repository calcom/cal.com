import client from "@sendgrid/client";
import type { MailData } from "@sendgrid/helpers/classes/mail";
import sgMail from "@sendgrid/mail";
import { JSDOM } from "jsdom";
import { v4 as uuidv4 } from "uuid";

import { SENDER_NAME } from "@calcom/lib/constants";
import { setTestEmail } from "@calcom/lib/testEmails";

interface EmailConfiguration {
  apiKey: string;
  fromAddress: string;
}

interface CustomParameters {
  msgId?: string;
}

const getEnvironmentConfig = (): EmailConfiguration | null => {
  const apiCredential = process.env.SENDGRID_API_KEY;
  const emailAddress = process.env.SENDGRID_EMAIL;

  if (apiCredential && emailAddress) {
    return {
      apiKey: apiCredential,
      fromAddress: emailAddress,
    };
  }

  return null;
};

const isTestingEnvironment = (): boolean => {
  return Boolean(process.env.NEXT_PUBLIC_IS_E2E || process.env.INTEGRATION_TEST_MODE);
};

const initializeSendgridServices = (): void => {
  const configuration = getEnvironmentConfig();

  if (configuration) {
    sgMail.setApiKey(configuration.apiKey);
    client.setApiKey(configuration.apiKey);
  } else {
    console.error("Sendgrid credentials are missing from the .env file");
  }
};

const generateBatchIdentifier = async (): Promise<string> => {
  if (isTestingEnvironment()) {
    return uuidv4();
  }

  initializeSendgridServices();

  const configuration = getEnvironmentConfig();
  if (!configuration) {
    console.info("No sendgrid API key provided, returning DUMMY_BATCH_ID");
    return "DUMMY_BATCH_ID";
  }

  const [, responseData] = await client.request({
    url: "/v3/mail/batch",
    method: "POST",
  });

  return responseData.batch_id as string;
};

const enhanceHtmlContent = (htmlString?: string): string => {
  if (!htmlString) {
    return "";
  }

  const documentParser = new JSDOM(htmlString);
  const anchorElements = Array.from(documentParser.window.document.querySelectorAll("h6 a")).map(
    (element) => element as HTMLElement
  );

  anchorElements.forEach((anchor) => {
    anchor.style.fontSize = "20px";
    anchor.style.textDecoration = "none";
  });

  return documentParser.serialize();
};

const executeEmailDelivery = (
  emailData: Partial<MailData>,
  additionalOptions: { sender?: string | null; includeCalendarEvent?: boolean },
  extraParameters?: CustomParameters
): Promise<any> => {
  initializeSendgridServices();

  if (isTestingEnvironment()) {
    if (!emailData.sendAt) {
      const config = getEnvironmentConfig();
      setTestEmail({
        to: emailData.to?.toString() || "",
        from: {
          email: config?.fromAddress || "",
          name: additionalOptions.sender || SENDER_NAME,
        },
        subject: emailData.subject || "",
        html: emailData.html || "",
      });
    }

    console.log(
      "Skipped Sending Email as process.env.NEXT_PUBLIC_IS_E2E or process.env.INTEGRATION_TEST_MODE is set. Emails are available in globalThis.testEmails"
    );

    return new Promise((resolve) => resolve("Skipped sendEmail for Unit Tests"));
  }

  const configuration = getEnvironmentConfig();
  if (!configuration) {
    console.info("No sendgrid API key provided, skipping email");
    return Promise.resolve();
  }

  const messagePayload = {
    to: emailData.to,
    from: {
      email: configuration.fromAddress,
      name: additionalOptions.sender || SENDER_NAME,
    },
    subject: emailData.subject,
    html: enhanceHtmlContent(emailData.html),
    batchId: emailData.batchId,
    replyTo: emailData.replyTo || configuration.fromAddress,
    attachments: emailData.attachments,
    sendAt: emailData.sendAt,
    ...(extraParameters?.msgId && {
      customArgs: {
        msgId: extraParameters.msgId,
      },
    }),
  };

  return sgMail.send(messagePayload);
};

const terminateScheduledMessage = (batchReference: string | null): Promise<any> => {
  if (!batchReference) {
    console.info("No referenceId provided, skip canceling email");
    return Promise.resolve();
  }

  initializeSendgridServices();

  return client.request({
    url: "/v3/user/scheduled_sends",
    method: "POST",
    body: {
      batch_id: batchReference,
      status: "cancel",
    },
  });
};

const removeScheduledDelivery = (batchReference: string | null): Promise<any> => {
  if (!batchReference) {
    console.info("No referenceId provided, skip deleting scheduledSend");
    return Promise.resolve();
  }

  initializeSendgridServices();

  return client.request({
    url: `/v3/user/scheduled_sends/${batchReference}`,
    method: "DELETE",
  });
};

export async function getBatchId() {
  return generateBatchIdentifier();
}

export function sendSendgridMail(
  mailData: Partial<MailData>,
  addData: { sender?: string | null; includeCalendarEvent?: boolean },
  customArgs?: CustomParameters
) {
  return executeEmailDelivery(mailData, addData, customArgs);
}

export function cancelScheduledEmail(referenceId: string | null) {
  return terminateScheduledMessage(referenceId);
}

export function deleteScheduledSend(referenceId: string | null) {
  return removeScheduledDelivery(referenceId);
}
