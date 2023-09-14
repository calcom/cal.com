import mail from "@sendgrid/mail";

const sendgridAPIKey = process.env.SENDGRID_API_KEY as string;

/**
 * Simply send an email by address, subject, and body.
 */
const send = async ({
  subject,
  to,
  from,
  text,
  html,
}: {
  subject: string;
  to: string;
  from: string;
  text: string;
  html?: string;
}): Promise<boolean> => {
  mail.setApiKey(sendgridAPIKey);

  const msg = {
    to,
    from: {
      email: from,
      name: "Cal AI",
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
