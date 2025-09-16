import { createTransport } from "nodemailer";

interface PostmarkConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

function getPostmarkTransport(): PostmarkConfig {
  if (!process.env.POSTMARK_SERVER_TOKEN) {
    throw new Error("POSTMARK_SERVER_TOKEN environment variable is required");
  }

  return {
    host: process.env.POSTMARK_SMTP_HOST || "smtp.postmarkapp.com",
    port: parseInt(process.env.POSTMARK_SMTP_PORT || "587"),
    secure: process.env.POSTMARK_SMTP_PORT === "465",
    auth: {
      user: process.env.POSTMARK_SMTP_USER || process.env.POSTMARK_SERVER_TOKEN,
      pass: process.env.POSTMARK_SERVER_TOKEN,
    },
  };
}

export async function sendEmail(message: string, email: string): Promise<void> {
  const transport = createTransport(getPostmarkTransport());

  const mailOptions = {
    from: process.env.POSTMARK_FROM_EMAIL || process.env.EMAIL_FROM || "notifications@cal.com",
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
