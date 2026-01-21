import { createTransport } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
}

const CONNECTION_TIMEOUT_MS = 10000;
const GREETING_TIMEOUT_MS = 10000;
const SOCKET_TIMEOUT_MS = 15000;

export interface TestEmailParams {
  config: SmtpConfig;
  fromEmail: string;
  fromName?: string;
  toEmail: string;
}

export class SmtpService {
  createTransportOptions(config: SmtpConfig): SMTPTransport.Options {
    return {
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      greetingTimeout: GREETING_TIMEOUT_MS,
      socketTimeout: SOCKET_TIMEOUT_MS,
    };
  }

  async testConnection(config: SmtpConfig): Promise<{ success: boolean; error?: string }> {
    const transport = createTransport(this.createTransportOptions(config));

    try {
      await transport.verify();
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      console.log("err: ", err);
      return { success: false, error };
    } finally {
      transport.close();
    }
  }

  async sendTestEmail(params: TestEmailParams): Promise<{ success: boolean; error?: string }> {
    const { config, fromEmail, fromName, toEmail } = params;
    const transport = createTransport(this.createTransportOptions(config));

    try {
      await transport.sendMail({
        from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
        to: toEmail,
        subject: "Cal.com SMTP Configuration Verification",
        text: `This is a test email to verify your SMTP configuration for Cal.com.

If you received this email, your SMTP configuration is working correctly.

From: ${fromEmail}
SMTP Host: ${config.host}
SMTP Port: ${config.port}

This email was sent as part of the SMTP configuration verification process.`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SMTP Configuration Verification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #111827;">Cal.com SMTP Configuration Verification</h2>
  <p style="color: #374151; line-height: 1.6;">
    This is a test email to verify your SMTP configuration for Cal.com.
  </p>
  <p style="color: #374151; line-height: 1.6;">
    If you received this email, your SMTP configuration is working correctly.
  </p>
  <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Configuration Details:</p>
    <p style="margin: 0; color: #111827;"><strong>From:</strong> ${fromEmail}</p>
    <p style="margin: 4px 0 0 0; color: #111827;"><strong>SMTP Host:</strong> ${config.host}</p>
    <p style="margin: 4px 0 0 0; color: #111827;"><strong>SMTP Port:</strong> ${config.port}</p>
  </div>
  <p style="color: #9ca3af; font-size: 12px;">
    This email was sent as part of the SMTP configuration verification process.
  </p>
</body>
</html>
`,
      });

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error };
    } finally {
      transport.close();
    }
  }
}
