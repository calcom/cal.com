import { serverConfig } from "../serverConfig";
import nodemailer, { SentMessageInfo } from "nodemailer";

const sendEmail = ({ to, subject, text, html = null }): Promise<string | SentMessageInfo> =>
  new Promise((resolve, reject) => {
    const { transport, from } = serverConfig;

    if (!to || !subject || (!text && !html)) {
      return reject("Missing required elements to send email.");
    }

    nodemailer.createTransport(transport).sendMail(
      {
        from: `Calendso ${from}`,
        to,
        subject,
        text,
        html,
      },
      (error, info) => {
        if (error) {
          console.error("SEND_INVITATION_NOTIFICATION_ERROR", to, error);
          return reject(error.message);
        }
        return resolve(info);
      }
    );
  });

export default sendEmail;
