import nodemailer from "nodemailer";

import { serverConfig } from "./serverConfig";

type SendEmailParams = {
  to: string | string[];
  subject: string;
  body: string;
  isHtml?: boolean;
};

async function sendEmailWithNodeMailer({ to, subject, body, isHtml = true }: SendEmailParams): Promise<void> {
  const transporter = nodemailer.createTransport(serverConfig.transport);

  await transporter.sendMail({
    from: serverConfig.from,
    to,
    subject,
    ...(isHtml ? { html: body } : { text: body }),
    headers: serverConfig.headers,
  });
}

export default sendEmailWithNodeMailer;
