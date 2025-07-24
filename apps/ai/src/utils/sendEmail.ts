import { Client } from "postmark";

import { env } from "../env.mjs";

const postmarkClient = new Client(env.POSTMARK_API_KEY);

/**
 * Simply send an email by address, subject, and body.
 */
const send = async ({
  subject,
  to,
  cc,
  from,
  text,
  html,
}: {
  subject: string;
  to: string | string[];
  cc?: string | string[];
  from: string;
  text: string;
  html?: string;
}): Promise<boolean> => {
  try {
    const message = {
      From: from,
      To: Array.isArray(to) ? to.join(",") : to,
      Cc: cc ? (Array.isArray(cc) ? cc.join(",") : cc) : undefined,
      Subject: subject,
      TextBody: text,
      HtmlBody: html,
      MessageStream: "outbound",
    };

    const result = await postmarkClient.sendEmail(message);
    return !!result.MessageID;
  } catch (error) {
    console.error("Failed to send email via Postmark:", error);
    return false;
  }
};

export default send;
