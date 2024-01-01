import mail from "@sendgrid/mail";

const sendgridAPIKey = process.env.SENDGRID_API_KEY as string;

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
  mail.setApiKey(sendgridAPIKey);

  const msg = {
    to,
    cc,
    from: {
      email: from,
      name: "Cal.ai",
    },
    text,
    html,
    subject,
  };

  const res = await mail.send(msg);
  const success = !!res;

  return success;
};

export default send;
