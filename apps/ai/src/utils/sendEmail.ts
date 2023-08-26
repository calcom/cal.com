import { Resend } from "resend";

import { env } from "../env.mjs";

const resend = new Resend(env.RESEND_API_KEY);

const send = async ({
  to,
  text,
  html,
  subject,
}: {
  to: string;
  text: string;
  subject: string;
  html?: string;
}) => {
  const msg = {
    from: env.SENDER_EMAIL,
    html,
    subject: `${subject}`,
    text,
    to,
  };

  // console.log("Sending email: ", msg);

  return !!(await resend.emails.send(msg));
};

export default send;
