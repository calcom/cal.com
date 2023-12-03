import mail from "@sendgrid/mail";

// import { sendEmailJob } from "@calcom/queues/jobs";

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

  // TODO: Is here the right place to invoke the job instead of the directly send the email?
  // if (sendEmailJob) {
  //   try {
  //     await sendEmailJob.invoke(msg);
  //     return true;
  //   } catch (error) {
  //     const res = await mail.send(msg);
  //     const success = !!res;
  //     return success;
  //   }
  // }

  const res = await mail.send(msg);
  const success = !!res;
  return success;
};

export default send;
