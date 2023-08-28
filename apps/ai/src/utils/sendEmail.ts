import { Resend } from "resend";

import { env } from "../env.mjs";

const resend = new Resend(env.RESEND_API_KEY);

/**
 * Simply send an email by address, subject, and body.
 */
const send = async ({
  subject,
  to,
  text,
  html,
}: {
  subject: string;
  to: string;
  text: string;
  html?: string;
}): Promise<boolean> => {
  const msg = {
    from: env.SENDER_EMAIL,
    html,
    subject,
    text,
    to,
  };

  const email = await resend.emails.send(msg);
  const success = !!email?.id;

  return success;
};

export default send;
