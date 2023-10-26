import type { TFunction } from "next-i18next";

import { APP_NAME, COMPANY_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export type EmailVerifyCode = {
  language: TFunction;
  user: {
    name?: string | null;
    email: string;
  };
  verificationEmailCode: string;
};

export default class AttendeeVerifyEmail extends BaseEmail {
  verifyAccountInput: EmailVerifyCode;

  constructor(passwordEvent: EmailVerifyCode) {
    super();
    this.name = "SEND_ACCOUNT_VERIFY_EMAIL";
    this.verifyAccountInput = passwordEvent;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      to: `${this.verifyAccountInput.user.name} <${this.verifyAccountInput.user.email}>`,
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      subject: this.verifyAccountInput.language("verify_email_subject", {
        appName: APP_NAME,
      }),
      html: await renderEmail("VerifyEmailByCode", this.verifyAccountInput),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return `
${this.verifyAccountInput.language("verify_email_subject", { appName: APP_NAME })}
${this.verifyAccountInput.language("verify_email_email_header")}
${this.verifyAccountInput.language("hi_user_name", { name: this.verifyAccountInput.user.name })},
${this.verifyAccountInput.language("verify_email_by_code_email_body")}
${this.verifyAccountInput.verificationEmailCode}
${this.verifyAccountInput.language("happy_scheduling")} ${this.verifyAccountInput.language(
      "the_calcom_team",
      { companyName: COMPANY_NAME }
    )}
`.replace(/(<([^>]+)>)/gi, "");
  }
}
