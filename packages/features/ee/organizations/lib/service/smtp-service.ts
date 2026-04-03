import type { TFunction } from "i18next";
import { createTransport } from "nodemailer";
import type { Options as SMTPTransportOptions } from "nodemailer/lib/smtp-transport";

import { sanitizeDisplayName } from "@calcom/emails/lib/sanitizeDisplayName";

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
  language: TFunction;
}

export class SmtpService {
  createTransportOptions(config: SmtpConfig): SMTPTransportOptions {
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
      return { success: false, error };
    } finally {
      transport.close();
    }
  }

  async sendTestEmail(params: TestEmailParams): Promise<{ success: boolean; error?: string }> {
    const { config, fromEmail, fromName, toEmail, language } = params;
    const transport = createTransport(this.createTransportOptions(config));

    const sanitizedFromName = fromName ? sanitizeDisplayName(fromName) : undefined;

    try {
      const { default: SmtpTestEmail } = await import("@calcom/emails/templates/smtp-test-email");
      const emailTemplate = new SmtpTestEmail({
        language,
        toEmail,
        fromEmail,
        fromName: sanitizedFromName,
        smtpHost: config.host,
        smtpPort: config.port,
      });

      const payload = await emailTemplate.getNodeMailerPayload();
      await transport.sendMail(payload);

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error };
    } finally {
      transport.close();
    }
  }
}
