import { createTransport } from "nodemailer";
import type SMTPConnection from "nodemailer/lib/smtp-connection";

function getMarketingEmailTransport(): SMTPConnection.Options {
  if (!process.env.MARKETING_EMAIL_SERVER_TOKEN) {
    throw new Error("MARKETING_EMAIL_SERVER_TOKEN environment variable is required");
  }

  return {
    host: process.env.EMAIL_SERVER_HOST || "smtp.postmarkapp.com",
    port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
    secure: process.env.EMAIL_SERVER_PORT === "465",
    auth: {
      user: process.env.EMAIL_SERVER_USER || process.env.MARKETING_EMAIL_SERVER_TOKEN,
      pass: process.env.MARKETING_EMAIL_SERVER_TOKEN,
    },
  };
}

export async function sendEmail(message: string, email: string): Promise<void> {
  const transport = createTransport(getMarketingEmailTransport());

  const mailOptions = {
    from: process.env.EMAIL_FROM || "notifications@cal.com",
    to: email,
    subject: "Message from Cal.com",
    text: message,
    html: `<p>${message.replace(/\n/g, "<br>")}</p>`,
  };

  try {
    await transport.sendMail(mailOptions);
    console.log(`Email sent successfully to ${email}`);
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  } finally {
    transport.close();
  }
}
