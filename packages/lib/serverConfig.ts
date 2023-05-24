import type SendmailTransport from "nodemailer/lib/sendmail-transport";
import type SMTPConnection from "nodemailer/lib/smtp-connection";

import { isENVDev } from "@calcom/lib/env";

function detectTransport(): SendmailTransport.Options | SMTPConnection.Options | string {
  if (process.env.EMAIL_SERVER) {
    return process.env.EMAIL_SERVER;
  }

  if (process.env.EMAIL_SERVER_HOST) {
    const port = parseInt(process.env.EMAIL_SERVER_PORT!);
    const user = process.env.EMAIL_SERVER_USER;
    const pass = process.env.EMAIL_SERVER_PASSWORD;
    let transport: SMTPConnection.Options = {
      host: process.env.EMAIL_SERVER_HOST,
      port,
      secure: port === 465,
      tls: {
        rejectUnauthorized: isENVDev ? false : true,
      },
    };

    if (user && pass && user.length > 0) {
      transport = {
        ...transport, auth: {
          user,
          pass,
        }
      }
    }
    return transport;
  }

  return {
    sendmail: true,
    newline: "unix",
    path: "/usr/sbin/sendmail",
  };
}

export const serverConfig = {
  transport: detectTransport(),
  from: process.env.EMAIL_FROM,
};
