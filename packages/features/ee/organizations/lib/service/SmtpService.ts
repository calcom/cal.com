import type { TFunction } from "i18next";
import { createTransport } from "nodemailer";
import type { Options as SMTPTransportOptions } from "nodemailer/lib/smtp-transport";

import { APP_NAME } from "@calcom/lib/constants";
import renderEmail from "@calcom/emails/src/renderEmail";

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

    try {
      const html = await renderEmail("SmtpTestEmail", {
        language,
        fromEmail,
        smtpHost: config.host,
        smtpPort: config.port,
      });

      const textBody = `
${language("smtp_test_email_subject", { appName: APP_NAME })}

${language("smtp_test_email_body", { appName: APP_NAME })}

${language("smtp_test_email_config_details")}
${language("from_email")}: ${fromEmail}
${language("smtp_host")}: ${config.host}
${language("smtp_port")}: ${config.port}

${language("happy_scheduling")}
`.trim();

      await transport.sendMail({
        from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
        to: toEmail,
        subject: language("smtp_test_email_subject", { appName: APP_NAME }),
        text: textBody,
        html,
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
