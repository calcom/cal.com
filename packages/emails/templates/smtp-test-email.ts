import type { TFunction } from "i18next";

import { APP_NAME, EMAIL_FROM_NAME } from "@calcom/lib/constants";

import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export type SmtpTestEmailInput = {
  language: TFunction;
  toEmail: string;
  fromEmail: string;
  fromName?: string;
  smtpHost: string;
  smtpPort: number;
};

export default class SmtpTestEmail extends BaseEmail {
  input: SmtpTestEmailInput;

  constructor(input: SmtpTestEmailInput) {
    super();
    this.name = "SEND_SMTP_TEST_EMAIL";
    this.input = input;
  }

  public async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      to: this.input.toEmail,
      from: this.input.fromName
        ? `"${this.input.fromName}" <${this.input.fromEmail}>`
        : `${EMAIL_FROM_NAME} <${this.input.fromEmail}>`,
      subject: this.input.language("smtp_test_email_subject", { appName: APP_NAME }),
      html: await renderEmail("SmtpTestEmail", {
        language: this.input.language,
        fromEmail: this.input.fromEmail,
        smtpHost: this.input.smtpHost,
        smtpPort: this.input.smtpPort,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return `
${this.input.language("smtp_test_email_subject", { appName: APP_NAME })}

${this.input.language("smtp_test_email_body", { appName: APP_NAME })}

${this.input.language("smtp_test_email_config_details")}
${this.input.language("from_email")}: ${this.input.fromEmail}
${this.input.language("smtp_host")}: ${this.input.smtpHost}
${this.input.language("smtp_port")}: ${this.input.smtpPort}

${this.input.language("happy_scheduling")}
`.trim();
  }
}
